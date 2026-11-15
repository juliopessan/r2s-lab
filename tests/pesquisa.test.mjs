import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import browser from './helpers/browser.cjs';
import progress from '../lib/progress.js';

const { withPage } = browser;
const { RATINGS, validateProgress } = progress;
const OPEN = '05-encerramento/pesquisa.html';

const NOTICE =
  'Suas respostas são identificadas para a coordenação do lab. Citações em materiais de divulgação só acontecem conforme o consentimento que você marcar abaixo.';
const RATING_LABELS = [
  'Conteúdo e exercícios', 'Hands-on com caso real', 'Mentoria e coaching', 'Carga e ritmo semanal',
  'Engajamento do patrocinador do caso', 'Demo day e feedback do painel', 'Pre-work (preparação)',
  'Confiança para conduzir um caso novo sozinho',
];
const OPEN_QUESTIONS = [
  'O que mais valeu a pena? Cite um momento ou entregável.',
  'O que você mudaria primeiro? Uma coisa só.',
  'O que você já aplicou no seu trabalho depois do lab?',
];

async function answer(page, { consent = 'anon', hours = '6', nps = '9' } = {}) {
  await page.check(`input[name="nps"][value="${nps}"]`);
  for (const key of RATINGS) await page.check(`input[name="r_${key}"][value="4"]`);
  if (hours !== null) await page.fill('#horas', hours);
  await page.fill('#aberta-melhor', 'A mentoria com o coach.');
  await page.fill('#aberta-mudar', 'Mais tempo protegido.');
  if (consent) await page.check(`input[name="consent"][value="${consent}"]`);
}

const msg = async (page) => (await page.locator('#export-msg').innerText()).trim();

test('shows the notice before the questions', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal((await page.locator('#aviso').innerText()).trim(), NOTICE);
    const before = await page.evaluate(() => Boolean(
      document.querySelector('#aviso').compareDocumentPosition(document.querySelector('#surveyForm')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ));
    assert.ok(before);
    assert.equal(await page.title(), 'Pesquisa R2S Lab');
  });
});

test('renders the NPS, eight ratings, hours, three open questions and three consent options', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await page.locator('input[name="nps"]').count(), 11);
    assert.deepEqual(
      (await page.locator('.rating-row .rating-label').allTextContents()).map((t) => t.trim()),
      RATING_LABELS,
    );
    for (const key of RATINGS) assert.equal(await page.locator(`input[name="r_${key}"]`).count(), 5);
    assert.equal(await page.locator('#horas').count(), 1);
    assert.deepEqual(
      (await page.locator('.open-question .open-label').allTextContents()).map((t) => t.trim()),
      OPEN_QUESTIONS,
    );
    assert.equal(await page.locator('.open-question textarea').count(), 3);
    assert.deepEqual(
      (await page.locator('.radios label').allTextContents()).map((t) => t.trim()),
      ['Não', 'Sim, sem meu nome', 'Sim, com meu nome'],
    );
    assert.equal(await page.locator('input[name="consent"]:checked').count(), 0, 'no consent is preselected');
  });
});

test('export lists what is missing', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    await page.click('#export-btn');
    const text = await msg(page);
    assert.ok(text.startsWith('Antes de exportar, responda:'));
    for (const label of ['NPS', ...RATING_LABELS, 'Horas por semana', 'consentimento']) {
      assert.ok(text.includes(label), `missing "${label}" in: ${text}`);
    }
    assert.equal(downloaded, false);
  });
});

test('export is blocked until consent is chosen', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await answer(page, { consent: null });
    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    await page.click('#export-btn');
    assert.equal(await msg(page), 'Antes de exportar, responda: consentimento de citação.');
    assert.equal(downloaded, false);
  });
});

test('hours must be a non-negative number', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await answer(page, { hours: '-1' });
    await page.click('#export-btn');
    assert.equal(await msg(page), 'Antes de exportar, responda: Horas por semana.');
  });
});

test('a complete survey exports', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.evaluate(() => {
      const p = window.R2SStore.load();
      p.prework.blocks['1.1'] = true;
      window.R2SStore.save(p);
    });
    await page.reload({ waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await answer(page, { consent: 'anon', nps: '10' });
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    assert.equal(download.suggestedFilename(), 'anasouza.json');
    const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(validateProgress(parsed), { ok: true, errors: [] });
    assert.equal(parsed.survey.nps, 10);
    assert.equal(parsed.survey.ratings.conteudo, 4);
    assert.equal(parsed.survey.hoursPerWeek, 6);
    assert.equal(parsed.survey.consent, 'anon');
    assert.equal(parsed.survey.open.melhor, 'A mentoria com o coach.');
    assert.equal(parsed.survey.open.aplicou, '');
    assert.ok(!Number.isNaN(Date.parse(parsed.survey.submittedAt)));
  });
});

test('the exported file keeps the pre-work section', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.evaluate(() => {
      const p = window.R2SStore.load();
      p.prework.blocks['1.1'] = true;
      window.R2SStore.save(p);
    });
    await page.reload({ waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await answer(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.equal(parsed.prework.blocks['1.1'], true);
    assert.equal(parsed.survey.nps, 9);
  });
});

test('answers persist across reload, even when incomplete', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.check('input[name="nps"][value="7"]');
    await page.fill('#aberta-mudar', 'Menos reuniões.');
    await page.check('input[name="consent"][value="nome"]');
    await page.reload({ waitUntil: 'load' });
    assert.ok(await page.isChecked('input[name="nps"][value="7"]'));
    assert.equal(await page.inputValue('#aberta-mudar'), 'Menos reuniões.');
    assert.ok(await page.isChecked('input[name="consent"][value="nome"]'));
  });
});

test('import restores a survey from a file', async () => {
  const survey = {
    nps: 8, ratings: Object.fromEntries(RATINGS.map((k) => [k, 5])), hoursPerWeek: 7,
    open: { melhor: 'Casos reais.', mudar: '', aplicou: '' }, consent: 'nome', submittedAt: '2027-04-01T10:00:00.000Z',
  };
  const file = {
    schema: 'r2s-progress/1', github: 'anasouza', updatedAt: '2027-04-01T10:00:00.000Z',
    prework: { blocks: {}, quizzes: {} }, selfAssessment: null, survey,
  };
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.setInputFiles('#import-input', { name: 'a.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
    await page.waitForFunction(() => document.querySelector('#export-msg').textContent.trim() === 'Progresso importado.');
    assert.ok(await page.isChecked('input[name="nps"][value="8"]'));
    assert.ok(await page.isChecked('input[name="r_conteudo"][value="5"]'));
    assert.equal(await page.inputValue('#horas'), '7');
    assert.equal(await page.inputValue('#aberta-melhor'), 'Casos reais.');
    assert.ok(await page.isChecked('input[name="consent"][value="nome"]'));
    assert.equal(await page.inputValue('#gh'), 'anasouza');
  });
});

test('contains no forbidden wording and no external requests', async () => {
  await withPage({}, async (page, url) => {
    const seen = [];
    page.on('request', (r) => seen.push(r.url()));
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.ok(!(await page.locator('body').innerText()).includes('Requirement-to-Solution'));
    assert.deepEqual(seen.filter((u) => !u.startsWith(url) && !u.startsWith('data:')), []);
  });
});
