import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import browser from './helpers/browser.cjs';
import { build } from '../src/build.mjs';
import { localFetchFile } from '../src/collect.mjs';

const { withPage } = browser;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'tests', 'fixtures');
const NOW = new Date('2026-12-03T12:00:00Z');
const tmp = () => mkdtempSync(path.join(tmpdir(), 'r2s-dash-'));
const CONFIG = { owner: 'local', target: 100, protectedHoursPerWeek: 6 };

async function buildDist({ fixturesDir = fixtures, rosterPath = path.join(fixtures, 'roster.csv'), fetchFile, probeRepo } = {}) {
  const out = tmp();
  await build({ rosterPath, outDir: out, config: CONFIG, fetchFile: fetchFile || localFetchFile(fixturesDir), probeRepo, now: NOW });
  return out;
}

const open = (out, opts, fn) =>
  withPage({ root: out, ...opts }, async (page, url) => {
    await page.goto(url + 'index.html', { waitUntil: 'load' });
    await fn(page, url);
  });

const text = async (page, sel) => (await page.locator(sel).innerText()).replace(/\s+/g, ' ').trim();

test('shows the four numbers and the target', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(await text(page, '#kpi-invited'), '6');
    assert.equal(await text(page, '#kpi-started'), '4');
    assert.equal(await text(page, '#kpi-done'), '3');
    assert.equal(await text(page, '#kpi-missing'), '3');
    assert.equal(await text(page, '#kpi-target'), '100');
    assert.ok((await text(page, '#generated')).includes('03/12/2026'));
  });
});

test('funnel rows show label and count', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    const rows = (await page.locator('#funnel li').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    assert.deepEqual(rows, ['Convidados 6', 'Iniciaram 4', 'Concluíram o pre-work 3', 'Responderam a pesquisa 3']);
  });
});

test('satisfaction block', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(await text(page, '#nps'), '0');
    assert.match(await text(page, '#nps-detail'), /Promotores 1 · Neutros 1 · Detratores 1/);
    const ratings = (await page.locator('#ratings li').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    assert.equal(ratings.length, 8);
    assert.ok(ratings.includes('Conteúdo e exercícios 4,0'));
    assert.ok(ratings.includes('Carga e ritmo semanal 3,7'));
    assert.equal(await text(page, '#hours'), '8,0 h por semana (protegidas: 6 h)');
  });
});

test('feedback shows the text for everyone and names only with consent', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(await page.locator('#feedback li').count(), 5);
    const body = await page.locator('body').innerText();
    assert.ok(body.includes('Ana Souza'));
    assert.ok(!body.includes('Bruno Lima'));
    assert.ok(!body.includes('Carla Mendes'));
    const carla = page.locator('#feedback li', { hasText: 'A carga semanal passou de 6 horas.' });
    assert.equal(await carla.count(), 1);
    assert.match(await carla.innerText(), /Não citar/);
    const ana = page.locator('#feedback li', { hasText: 'A mentoria com o coach' });
    assert.match(await ana.innerText(), /Ana Souza/);
    assert.match(await ana.innerText(), /Pode citar/);
  });
});

test('the theme filter narrows the list', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    await page.click('button[data-theme="carga"]');
    assert.equal(await page.locator('#feedback li').count(), 2);
    assert.equal(await page.getAttribute('button[data-theme="carga"]', 'aria-pressed'), 'true');
    await page.click('button[data-theme="mentoria"]');
    assert.equal(await page.locator('#feedback li').count(), 1);
    assert.equal(await page.getAttribute('button[data-theme="carga"]', 'aria-pressed'), 'false');
    await page.click('button[data-theme="all"]');
    assert.equal(await page.locator('#feedback li').count(), 5);
  });
});

test('data quality lists the missing and invalid handles', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    const quality = await text(page, '#quality');
    assert.ok(quality.includes('elisarocha'));
    assert.ok(quality.includes('fabionunes'));
    assert.ok(quality.includes('schema deve ser r2s-progress/1.'));
  });
});

test('scope note is shown verbatim', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(
      await text(page, '#scope-note'),
      'Na visão geral, "concluíram" significa pre-work concluído. Os níveis Foundation, Practitioner e Lead aparecem em "Certificação".',
    );
  });
});

test('html in free text is shown as text', async () => {
  const dir = tmp();
  cpSync(path.join(fixtures, 'progress'), path.join(dir, 'progress'), { recursive: true });
  const file = path.join(dir, 'progress', 'anasouza.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.survey.open.melhor = '<img src=x onerror="window.__pwned=1"> e <script>window.__pwned=2</script>';
  writeFileSync(file, JSON.stringify(data));
  const out = await buildDist({ fixturesDir: dir });
  await open(out, {}, async (page) => {
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    assert.equal(await page.locator('#feedback img').count(), 0);
    assert.ok((await page.locator('#feedback').innerText()).includes('<img src=x onerror="window.__pwned=1">'));
  });
});

test('empty data renders dashes, not NaN', async () => {
  const header = path.join(tmp(), 'empty.csv');
  writeFileSync(header, 'nome,email,github,onda,papel_atual,multiplicador\n');
  const out = await buildDist({ rosterPath: header });
  await open(out, {}, async (page) => {
    assert.equal(await text(page, '#nps'), '—');
    assert.equal(await text(page, '#hours'), '— (protegidas: 6 h)');
    assert.equal(await text(page, '#kpi-invited'), '0');
    const body = await page.locator('body').innerText();
    assert.ok(!/NaN|Infinity|undefined/.test(body), body);
    const ratings = await page.locator('#ratings li').allInnerTexts();
    assert.ok(ratings.every((r) => r.includes('—')));
    assert.match(await text(page, '#feedback'), /Nenhum feedback/);
  });
});

test('missing data shows the error', async () => {
  const out = await buildDist();
  rmSync(path.join(out, 'data.js'));
  await open(out, {}, async (page) => {
    assert.ok(await page.locator('#error').isVisible());
    assert.equal(
      await text(page, '#error'),
      'Não encontrei os dados do painel. Rode o build e abra o index.html gerado em dist/.',
    );
    assert.equal(await page.locator('#app').isVisible(), false);
  });
});

test('makes no external requests', async () => {
  const out = await buildDist();
  await withPage({ root: out }, async (page, url) => {
    const seen = [];
    page.on('request', (r) => seen.push(r.url()));
    await page.goto(url + 'index.html', { waitUntil: 'load' });
    assert.deepEqual(seen.filter((u) => !u.startsWith(url) && !u.startsWith('data:')), []);
  });
});

test('the real dashboard files are copied by the build', async () => {
  const out = await buildDist();
  for (const f of ['index.html', 'dashboard.css', 'dashboard.js', 'data.js', 'data.json']) {
    assert.ok(existsSync(path.join(out, f)), f);
  }
});

test('no horizontal scroll at 360 px', async () => {
  const out = await buildDist();
  await open(out, { viewport: { width: 360, height: 800 } }, async (page) => {
    const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(scrollWidth <= innerWidth, `scrollWidth ${scrollWidth} > ${innerWidth}`);
  });
});

const channel = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('contrast meets AA', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    const rows = await page.evaluate(() => {
      const bgOf = (el) => {
        for (let n = el; n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor.match(/[\d.]+/g).map(Number);
          if (c.length < 4 || c[3] > 0.99) return c.slice(0, 3);
        }
        return [14, 17, 22];
      };
      return ['body', 'h2', '.muted', '.kpi-label', '.kpi b', '.f-label', '.f-count', '.fb-meta', '.badge', 'button[data-theme]', '#scope-note', '.rating-value', 'header b', '.squad-name', '.squad-case', '.squad-gate', '.sc-label', '.sc-value', '.sc-target', '.sc-status', '#cert-counts p', '#cert-people th', '#cert-people td']
        .map((sel) => ({ sel, el: document.querySelector(sel) }))
        .filter((x) => x.el)
        .map(({ sel, el }) => ({ sel, fg: getComputedStyle(el).color.match(/[\d.]+/g).map(Number).slice(0, 3), bg: bgOf(el) }));
    });
    assert.ok(rows.length >= 8, `only ${rows.length} selectors found`);
    for (const r of rows) assert.ok(ratio(r.fg, r.bg) >= 4.5, `${r.sel}: ${ratio(r.fg, r.bg).toFixed(2)}`);
  });
});

test('reduced motion has no transitions or animations', async () => {
  const out = await buildDist();
  await open(out, { reducedMotion: 'reduce' }, async (page) => {
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((e) => parseFloat(getComputedStyle(e).transitionDuration) > 0 || getComputedStyle(e).animationName !== 'none')
        .map((e) => e.tagName));
    assert.deepEqual(moving, []);
  });
});

test('filter buttons are focusable with a visible outline', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    await page.focus('button[data-theme="all"]');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const width = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
    assert.ok(width > 0, `outline ${width}`);
  });
});

/* ---------- aviso de pessoas não lidas ---------- */

test('a banner warns when people could not be read', async () => {
  const out = await buildDist({ fetchFile: async () => ({ status: 500 }) });
  await open(out, {}, async (page) => {
    assert.ok(await page.locator('#unread-banner').isVisible());
    assert.equal(
      await text(page, '#unread-banner'),
      '6 pessoas não puderam ser lidas (acesso ou erro da API); os números abaixo estão incompletos.',
    );
    assert.ok((await text(page, '#quality')).includes('falha ao ler (status 500)'));
  });
});

test('the banner uses the singular for one person', async () => {
  const local = localFetchFile(fixtures);
  const out = await buildDist({
    fetchFile: async (owner, repo, p) => (repo === 'r2s-lab-anasouza' ? { status: 403 } : local(owner, repo, p)),
  });
  await open(out, {}, async (page) => {
    assert.equal(
      await text(page, '#unread-banner'),
      '1 pessoa não pôde ser lida (acesso ou erro da API); os números abaixo estão incompletos.',
    );
  });
});

test('there is no banner when everyone was read', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(await page.locator('#unread-banner').isVisible(), false);
  });
});

test('people whose repository is not found are listed as unread with the reason', async () => {
  const out = await buildDist({ fetchFile: async () => ({ status: 404 }), probeRepo: async () => ({ status: 404 }) });
  await open(out, {}, async (page) => {
    assert.ok((await text(page, '#quality')).includes('repositório r2s-lab-anasouza não encontrado ou sem acesso do token'));
  });
});


/* ---------- squads, certificação e scorecard ---------- */

const rowsOf = async (page, sel) => (await page.locator(sel).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());

test('the squad row shows the five summaries', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(await page.locator('#squads li.squad').count(), 1);
    assert.equal(await text(page, '.squad-name'), 'multiplicadores');
    assert.equal(await text(page, '.squad-case'), 'Fechamento do caixa');
    assert.equal(await text(page, '.squad-gate'), 'Gate atual: G3');
    assert.equal(await text(page, '.squad-dossier'), 'Dossiê: 82%');
    assert.equal(await text(page, '.squad-first'), '1ª tentativa: 2 de 3');
    assert.equal(await text(page, '.squad-decision'), 'Decisão do patrocinador: pendente');
    assert.equal(await text(page, '.squad-review'), 'Revisão de 90 dias: ainda não vence');
  });
});

test('certification shows the counts and a table of users without names', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    const counts = await text(page, '#cert-counts');
    assert.ok(counts.includes('Foundation 1 · Practitioner 1 · Lead 0 · Sem nível 1'), counts);
    assert.ok(counts.includes('2 de 100'), counts);
    const rows = await rowsOf(page, '#cert-people tbody tr');
    assert.deepEqual(rows, [
      'anasouza multiplicadores 3,28 Practitioner',
      'brunolima multiplicadores 2,92 Foundation',
      'carlamendes multiplicadores 2,69 Sem nível',
    ]);
    const table = await text(page, '#cert-people');
    assert.ok(!/Ana Souza|Bruno Lima|Carla Mendes|@/.test(table));
  });
});

test('the scorecard lists ten items in order with values, targets and status', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(await page.locator('#scorecard li.sc').count(), 10);
    const rows = await rowsOf(page, '#scorecard li.sc');
    assert.ok(rows[0].includes('88,3%') && rows[0].includes('≥ 85%') && rows[0].includes('Meta atingida'), rows[0]);
    assert.ok(rows[1].includes('66,7%') && rows[1].includes('Abaixo da meta'), rows[1]);
    assert.ok(rows[2].includes('40,0%') && rows[2].includes('Meta atingida'), rows[2]);
    assert.ok(rows[6].includes('R$ 360.000,00') && rows[6].includes('Acompanhando'), rows[6]);
    assert.ok(rows[8].includes('Não medido') && rows[9].includes('Não medido'), rows.slice(8).join('|'));
    assert.ok(!rows.join(' ').includes('NaN'));
  });
});

test('without squads the page says so and still lists the scorecard as not measured', async () => {
  const dir = tmp();
  cpSync(path.join(fixtures, 'progress'), path.join(dir, 'progress'), { recursive: true });
  const out = await buildDist({ fixturesDir: dir });
  await open(out, {}, async (page) => {
    assert.equal(await text(page, '#squads'), 'Nenhuma squad registrada ainda.');
    assert.equal(await page.locator('#scorecard li.sc').count(), 10);
    assert.ok((await rowsOf(page, '#scorecard li.sc')).every((r) => r.includes('Não medido')));
    assert.ok(!(await page.locator('body').innerText()).includes('NaN'));
  });
});

test('squads that could not be read are named in a note', async () => {
  const local = localFetchFile(fixtures);
  const out = await buildDist({
    fetchFile: async (owner, repo, p) => (repo.startsWith('r2s-lab-squad-') ? { status: 500 } : local(owner, repo, p)),
  });
  await open(out, {}, async (page) => {
    assert.ok(await page.locator('#squads-note').isVisible());
    assert.match(await text(page, '#squads-note'), /Squads não lidas: multiplicadores/);
  });
});

function squadFixtureWith({ name = 'multiplicadores', editGates } = {}) {
  const dir = tmp();
  cpSync(path.join(fixtures, 'progress'), path.join(dir, 'progress'), { recursive: true });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  cpSync(path.join(fixtures, 'squads', 'multiplicadores'), path.join(dir, 'squads', slug), { recursive: true });
  const gatesFile = path.join(dir, 'squads', slug, 'squad', 'gates.json');
  const gates = JSON.parse(readFileSync(gatesFile, 'utf8'));
  if (editGates) editGates(gates);
  writeFileSync(gatesFile, JSON.stringify(gates));
  const roster = readFileSync(path.join(fixtures, 'roster.csv'), 'utf8').replaceAll('multiplicadores', name);
  const rosterPath = path.join(dir, 'roster.csv');
  writeFileSync(rosterPath, roster);
  return { dir, rosterPath };
}

test('html in a squad case is shown as text', async () => {
  const { dir, rosterPath } = squadFixtureWith({ editGates: (g) => { g.case = '<img src=x onerror="window.__pwned=1"> caso'; } });
  const out = await buildDist({ fixturesDir: dir, rosterPath });
  await open(out, {}, async (page) => {
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    assert.ok((await text(page, '.squad-case')).includes('<img src=x'));
  });
});

test('a very long squad name and case do not scroll sideways at 360 px', async () => {
  const name = 'squad' + 'x'.repeat(90);
  const { dir, rosterPath } = squadFixtureWith({ name, editGates: (g) => { g.case = 'caso' + 'y'.repeat(120); } });
  const out = await buildDist({ fixturesDir: dir, rosterPath });
  await open(out, { viewport: { width: 360, height: 800 } }, async (page) => {
    assert.equal(await page.locator('#squads li.squad').count(), 1);
    const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(scrollWidth <= innerWidth, `scrollWidth ${scrollWidth} > ${innerWidth}`);
  });
});

test('the 90-day review shows pending and overdue states', async () => {
  const { dir, rosterPath } = squadFixtureWith({
    editGates: (g) => {
      Object.assign(g.gates.G3, { status: 'passed', approvedBy: 'coach-exemplo', approvedAt: '2026-07-20', costPerTransaction: 0.04 });
      Object.assign(g.gates.G4, { status: 'passed', attempts: 1, approvedBy: 'Controladoria', approvedAt: '2026-08-01', decision: 'escalar' });
    },
  });
  const out = await buildDist({ fixturesDir: dir, rosterPath });
  await open(out, {}, async (page) => {
    assert.equal(await text(page, '.squad-review'), 'Revisão de 90 dias: atrasada (venceu em 30/10/2026)');
    assert.equal(await text(page, '.squad-decision'), 'Decisão do patrocinador: escalar');
  });
});

test('the dashboard shows the R2S Academy badges per course', async () => {
  const out = await buildDist();
  await open(out, {}, async (page) => {
    assert.equal(await text(page, '#ac-selos'), '16');
    assert.equal(await text(page, '#ac-pessoas'), '3');
    assert.equal(await text(page, '#ac-leitores'), '1');
    const rowsAc = (await page.locator('#ac-cursos tbody tr').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    assert.equal(rowsAc.length, 11);
    assert.equal(rowsAc[0], 'GenAI na prática Pre-work 3 50%');
    assert.equal(rowsAc[5], 'Intake e o G0 Jornada da squad 1 17%');
  });
});
