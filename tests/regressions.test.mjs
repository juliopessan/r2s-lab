import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import browser from './helpers/browser.cjs';
import progress from '../lib/progress.js';
import storeLib from '../lib/store.js';

const { withPage } = browser;
const { RATINGS, emptyProgress, hasPreworkProgress } = progress;
const { createStore } = storeLib;
const PREWORK = '00-prework/index.html';
const PESQUISA = '05-encerramento/pesquisa.html';

async function answerSurvey(page, { consent = 'anon', nps = '9' } = {}) {
  await page.check(`input[name="nps"][value="${nps}"]`);
  for (const key of RATINGS) await page.check(`input[name="r_${key}"][value="4"]`);
  await page.fill('#horas', '6');
  await page.fill('#aberta-melhor', 'A mentoria com o coach.');
  if (consent) await page.check(`input[name="consent"][value="${consent}"]`);
}

const file = (name, obj) => ({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj)) });
const preworkFile = (extra = {}) => ({
  schema: 'r2s-progress/1', github: 'anasouza', updatedAt: '2026-12-01T10:00:00.000Z',
  prework: { blocks: { '2.1': true }, quizzes: {} }, selfAssessment: null, survey: null, ...extra,
});

/* ---------- contrato e store (Node) ---------- */

test('hasPreworkProgress sees blocks, quizzes and the self-assessment', () => {
  const p = emptyProgress('anasouza');
  assert.equal(hasPreworkProgress(p), false);
  p.prework.blocks['1.1'] = true;
  assert.equal(hasPreworkProgress(p), true);
  const q = emptyProgress('anasouza');
  q.prework.quizzes.m1_llm = { answered: 1, correct: 1 };
  assert.equal(hasPreworkProgress(q), true);
  const s = emptyProgress('anasouza');
  s.selfAssessment = { problemFraming: 2 };
  assert.equal(hasPreworkProgress(s), true);
});

test('clearAll removes the state and every draft key', () => {
  const m = new Map([
    ['r2s-progress-v1', '{}'], ['r2s-prework-answers-v1', '{}'], ['r2s-prework-fields-v1', '{}'],
    ['r2s-survey-draft-v1', '{}'], ['outra-coisa', 'x'],
  ]);
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  createStore(storage).clearAll();
  assert.deepEqual([...m.keys()], ['outra-coisa']);
});

/* ---------- importante 1: exportar a pesquisa sem o pre-work ---------- */

test('a survey export without pre-work progress asks for confirmation, then exports', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + PESQUISA, { waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await answerSurvey(page);
    let downloads = 0;
    page.on('download', () => { downloads++; });
    await page.click('#export-btn');
    const text = (await page.locator('#export-msg').innerText()).trim();
    assert.ok(text.startsWith('Seu arquivo vai sem o pre-work'), text);
    assert.ok(text.includes('clique em Exportar de novo'));
    assert.equal(downloads, 0);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(parsed.prework.blocks, {});
    assert.equal(parsed.survey.nps, 9);
  });
});

test('with pre-work progress in the browser the survey exports at once', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + PESQUISA, { waitUntil: 'load' });
    await page.evaluate(() => {
      const p = window.R2SStore.load();
      p.prework.blocks['1.1'] = true;
      window.R2SStore.save(p);
    });
    await page.reload({ waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await answerSurvey(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    assert.equal(JSON.parse(readFileSync(await download.path(), 'utf8')).prework.blocks['1.1'], true);
  });
});

test('the survey page tells people to import first, above the form', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + PESQUISA, { waitUntil: 'load' });
    assert.match(await page.locator('#aviso-import').innerText(), /importe antes/);
    const above = await page.evaluate(() => Boolean(
      document.querySelector('#aviso-import').compareDocumentPosition(document.querySelector('#surveyForm')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ));
    assert.ok(above);
  });
});

/* ---------- importante 2: importar não apaga respostas da pesquisa ---------- */

test('importing a pre-work-only file keeps the survey answers', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + PESQUISA, { waitUntil: 'load' });
    await answerSurvey(page);
    await page.setInputFiles('#import-input', file('pre.json', preworkFile()));
    await page.waitForFunction(() => document.querySelector('#export-msg').textContent.trim() === 'Progresso importado.');
    assert.ok(await page.isChecked('input[name="nps"][value="9"]'));
    assert.equal(await page.inputValue('#aberta-melhor'), 'A mentoria com o coach.');
    assert.ok(await page.isChecked('input[name="consent"][value="anon"]'));
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.equal(parsed.survey.nps, 9);
    assert.equal(parsed.prework.blocks['2.1'], true);
  });
});

/* ---------- importante 3: duas abas não se sobrescrevem ---------- */

test('two open tabs keep each other\'s data', async () => {
  await withPage({}, async (pageA, url) => {
    const pageB = await pageA.context().newPage();
    await pageA.goto(url + PREWORK, { waitUntil: 'load' });
    await pageB.goto(url + PESQUISA, { waitUntil: 'load' });
    await answerSurvey(pageB);
    await pageA.check('input[data-block="1.1"]');
    let saved = await pageA.evaluate(() => window.R2SStore.load());
    assert.equal(saved.prework.blocks['1.1'], true);
    assert.equal(saved.survey && saved.survey.nps, 9, 'the survey must survive a pre-work change');
    await pageB.check('input[name="nps"][value="8"]');
    saved = await pageA.evaluate(() => window.R2SStore.load());
    assert.equal(saved.prework.blocks['1.1'], true, 'the pre-work must survive a survey change');
    assert.equal(saved.survey.nps, 8);
  });
});

/* ---------- importante 4: limpar apaga tudo ---------- */

test('reset erases every draft key from either page', async () => {
  await withPage({}, async (pageA, url) => {
    const pageB = await pageA.context().newPage();
    await pageA.goto(url + PREWORK, { waitUntil: 'load' });
    await pageA.fill('#b_nome', 'SEGREDO-123');
    await pageA.locator('.quiz[data-quiz="m1_llm"] .q').nth(0).locator('.opt').nth(0).click();
    await pageA.check('input[data-block="1.1"]');
    await pageB.goto(url + PESQUISA, { waitUntil: 'load' });
    await pageB.check('input[name="nps"][value="7"]');
    await pageB.click('#reset-btn');
    await pageB.click('#reset-btn');
    await pageB.waitForLoadState('load');
    const keys = await pageB.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith('r2s-')));
    assert.deepEqual(keys, []);
  });
  await withPage({}, async (page, url) => {
    await page.goto(url + PESQUISA, { waitUntil: 'load' });
    await page.check('input[name="nps"][value="7"]');
    await page.goto(url + PREWORK, { waitUntil: 'load' });
    await page.click('#reset-btn');
    await page.click('#reset-btn');
    await page.waitForLoadState('load');
    const keys = await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith('r2s-')));
    assert.deepEqual(keys, []);
  });
});

/* ---------- importante 5: responder de novo não derruba o importado ---------- */

test('answering one quiz question after an import does not lower the imported score', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + PREWORK, { waitUntil: 'load' });
    await page.setInputFiles('#import-input', file('a.json', preworkFile({
      prework: { blocks: {}, quizzes: { m1_llm: { answered: 2, correct: 1 } } },
    })));
    await page.waitForFunction(() => document.querySelector('#export-msg').textContent.trim() === 'Progresso importado.');
    await page.locator('.quiz[data-quiz="m1_llm"] .q').nth(0).locator('.opt').nth(0).click();
    const saved = await page.evaluate(() => window.R2SStore.load().prework.quizzes.m1_llm);
    assert.deepEqual(saved, { answered: 2, correct: 1 });
  });
});

/* ---------- a11y promovido: bordas dos campos ---------- */

const channel = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

for (const path of [PREWORK, PESQUISA]) {
  test(`${path}: field borders meet 3:1`, async () => {
    await withPage({}, async (page, url) => {
      await page.goto(url + path, { waitUntil: 'load' });
      const rows = await page.evaluate(() => {
        const out = [];
        const parentBg = (el) => {
          for (let n = el.parentElement; n; n = n.parentElement) {
            const c = getComputedStyle(n).backgroundColor.match(/[\d.]+/g).map(Number);
            if (c.length < 4 || c[3] > 0.99) return c.slice(0, 3);
          }
          return [14, 17, 22];
        };
        for (const sel of ['#gh', 'textarea', 'input[type="number"]', '.opt', '.scale span']) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const s = getComputedStyle(el);
          out.push({ sel, border: s.borderTopColor.match(/[\d.]+/g).map(Number).slice(0, 3), bg: parentBg(el) });
        }
        return out;
      });
      assert.ok(rows.length >= 2, 'fields were found');
      for (const row of rows) assert.ok(ratio(row.border, row.bg) >= 3, `${path} ${row.sel}: ${ratio(row.border, row.bg).toFixed(2)}`);
    });
  });
}
