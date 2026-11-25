import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import browser from './helpers/browser.cjs';

const { withPage } = browser;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = 'academy/index.html';
const COURSE = (c) => `academy/curso.html?c=${c}`;
const text = async (page, sel) => (await page.locator(sel).innerText()).replace(/\s+/g, ' ').trim();
const rows = async (page, sel) => (await page.locator(sel).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());

/** Estado salvo como o pre-work o grava. */
const seed = (blocks) => (page) =>
  page.addInitScript((b) => {
    const state = { schema: 'r2s-progress/1', github: '', updatedAt: new Date().toISOString(), prework: { blocks: b, quizzes: {} }, selfAssessment: null, survey: null };
    localStorage.setItem('r2s-progress-v1', JSON.stringify(state));
  }, blocks);

test('the home has the question, the search and five course cards', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await page.title(), 'R2S Academy');
    assert.equal(await text(page, 'h1'), 'O que você quer aprender?');
    assert.equal(await page.locator('#busca').count(), 1);
    assert.equal(await page.locator('#cursos li.curso').count(), 5);
  });
});

test('each card shows type, lessons, quizzes and duration like the Academy cards', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    const metas = await rows(page, '#cursos li.curso .curso-meta');
    assert.deepEqual(metas, [
      'Curso · 3 lições · 3 quizzes · 2 h 30',
      'Curso · 3 lições · 2 quizzes · 1 h 45',
      'Curso · 3 lições · 3 quizzes · 1 h 30',
      'Curso · 2 lições · 1 quiz · 1 h 15',
      'Curso · 2 lições · 1 h',
    ]);
    const titles = await rows(page, '#cursos li.curso .curso-titulo');
    assert.deepEqual(titles, ['GenAI na prática', 'Do pedido ao problema', 'Valor e custo', 'Responsabilidade e decisão', 'Exercício final']);
  });
});

test('the search filters the cards and ignores accents and case', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    await page.fill('#busca', 'PITCH');
    assert.deepEqual(await rows(page, '#cursos li.curso .curso-titulo'), ['Responsabilidade e decisão']);
    await page.fill('#busca', 'responsabilidade');
    assert.equal(await page.locator('#cursos li.curso').count(), 1);
    await page.fill('#busca', 'xyzzy');
    assert.equal(await page.locator('#cursos li.curso').count(), 0);
    assert.equal(await text(page, '#sem-resultado'), 'Nenhum curso encontrado.');
    await page.fill('#busca', '');
    assert.equal(await page.locator('#cursos li.curso').count(), 5);
    assert.equal(await page.locator('#sem-resultado').isVisible(), false);
  });
});

test('the theme cards filter the catalog', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#temas li.tema .tema-titulo'), ['Fundamentos', 'Valor e decisão', 'Case brief']);
    await page.click('#temas li.tema:nth-child(2) button');
    assert.deepEqual(await rows(page, '#cursos li.curso .curso-titulo'), ['Valor e custo', 'Responsabilidade e decisão']);
    await page.click('#temas li.tema:nth-child(2) button');
    assert.equal(await page.locator('#cursos li.curso').count(), 5, 'a second click clears the filter');
  });
});

test('a card shows progress from the saved state and links to the course', async () => {
  await withPage({}, async (page, url) => {
    await seed({ '1.1': true, '1.2': true })(page);
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await text(page, '#cursos li.curso:nth-child(1) .curso-progresso'), '2 de 3 lições');
    assert.equal(await text(page, '#cursos li.curso:nth-child(2) .curso-progresso'), 'Não iniciado');
    assert.match(await page.getAttribute('#cursos li.curso:nth-child(1) a', 'href'), /curso\.html\?c=p1$/);
  });
});

test('the course page lists lessons with minutes and the lesson state', async () => {
  await withPage({}, async (page, url) => {
    await seed({ '1.1': true })(page);
    await page.goto(url + COURSE('p1'), { waitUntil: 'load' });
    assert.equal(await text(page, 'h1'), 'GenAI na prática');
    assert.equal(await text(page, '#meta'), 'Curso · 3 lições · 3 quizzes · 2 h 30');
    assert.deepEqual(await rows(page, '#licoes li.licao .licao-titulo'), ['Como um LLM gera texto', 'Prompting que funciona', 'Regra, ML, LLM ou agente?']);
    assert.deepEqual(await rows(page, '#licoes li.licao .licao-min'), ['45 min', '60 min', '45 min']);
    assert.deepEqual(await rows(page, '#licoes li.licao .licao-estado'), ['Concluída', 'Pendente', 'Pendente']);
    assert.equal(await text(page, '#progresso'), '1 de 3 lições · 45 de 150 min');
    assert.equal(await text(page, '#cta'), 'Continuar');
    assert.equal(await page.locator('#selo').isVisible(), false);
    assert.ok((await page.getAttribute('#cta', 'href')).includes('00-prework/index.html#p1h'));
  });
});

test('the call to action starts, continues and reviews', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + COURSE('p2'), { waitUntil: 'load' });
    assert.equal(await text(page, '#cta'), 'Começar');
  });
  await withPage({}, async (page, url) => {
    await seed({ '2.1': true, '2.2': true, '2.3': true })(page);
    await page.goto(url + COURSE('p2'), { waitUntil: 'load' });
    assert.equal(await text(page, '#cta'), 'Revisar');
  });
});

test('finishing every lesson shows the seal on the course and on the home', async () => {
  await withPage({}, async (page, url) => {
    await seed({ '5.1': true, '5.2': true })(page);
    await page.goto(url + COURSE('p5'), { waitUntil: 'load' });
    assert.equal(await page.locator('#selo').isVisible(), true);
    assert.match(await text(page, '#selo'), /Exercício final/);
    assert.match(await text(page, '#selo'), /Concluído/);
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#selos li.selo'), ['Exercício final Concluído']);
  });
});

test('the home says there are no seals yet', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await text(page, '#selos'), 'Você ainda não concluiu nenhum curso. Os selos aparecem aqui.');
  });
});

test('an unknown course shows a way back instead of an empty page', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + COURSE('nada'), { waitUntil: 'load' });
    assert.match(await text(page, '#nao-encontrado'), /Curso não encontrado/);
    assert.match(await page.getAttribute('#nao-encontrado a', 'href'), /index\.html$/);
  });
});

test('text from the catalog is never parsed as HTML and the pages load nothing external', async () => {
  for (const p of [HOME, COURSE('p1')]) {
    await withPage({ viewport: { width: 360, height: 800 } }, async (page, url) => {
      const external = [];
      page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:')) external.push(r.url()); });
      await page.goto(url + p, { waitUntil: 'load' });
      assert.deepEqual(external, [], p);
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert.ok(sw <= iw, `${p}: ${sw} > ${iw}`);
      assert.deepEqual(page.errors || [], [], p);
    });
  }
  for (const f of ['academy/index.html', 'academy/curso.html', 'js/academy.js', 'css/academy.css']) {
    const t = readFileSync(path.join(root, f), 'utf8');
    assert.ok(!t.includes('Requirement-to-Solution'), f);
    assert.ok(!/innerHTML\s*=/.test(t), `${f} writes HTML from strings`);
  }
});

test('the controls have a visible focus and the seal is not the only sign of completion', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    for (const sel of ['#busca', '#temas li.tema:nth-child(1) button']) {
      await page.focus(sel);
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const w = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
      assert.ok(w > 0, `${sel}: ${w}`);
    }
  });
});

test('reduced motion removes the card transitions', async () => {
  await withPage({ reducedMotion: 'reduce' }, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll('*')].filter((e) => parseFloat(getComputedStyle(e).transitionDuration) > 0 || getComputedStyle(e).animationName !== 'none').length);
    assert.equal(moving, 0);
  });
});
