import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import browser from './helpers/browser.cjs';
import progress from '../lib/progress.js';
import storeLib from '../lib/store.js';

const { withPage } = browser;
const { validateProgress, COMPETENCIES } = progress;
const { createStore } = storeLib;
const OPEN = '00-prework/index.html';
const NOW = new Date('2026-12-03T12:00:00Z');

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function storeWith(blocks = {}) {
  const storage = fakeStorage();
  const store = createStore(storage);
  const p = store.load();
  p.prework.blocks = blocks;
  store.save(p);
  return { store, storage };
}

const valid = (extra = {}) => ({
  schema: 'r2s-progress/1',
  github: 'anasouza',
  updatedAt: '2026-12-01T10:00:00.000Z',
  prework: { blocks: { '2.1': true }, quizzes: { m1_llm: { answered: 2, correct: 1 } } },
  selfAssessment: null,
  survey: null,
  ...extra,
});

/* ---------- Node: o store ---------- */

test('export is blocked without a GitHub username', () => {
  const { store } = storeWith({ '1.1': true });
  assert.deepEqual(store.buildExport('   ', NOW), { ok: false, errors: ['Informe o seu usuário do GitHub.'] });
});

test('export is blocked for an invalid username', () => {
  const { store } = storeWith();
  const result = store.buildExport('-ab', NOW);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Usuário do GitHub inválido.'));
});

test('export filename and content', () => {
  const { store } = storeWith({ '1.1': true });
  const result = store.buildExport('anasouza', NOW);
  assert.equal(result.ok, true);
  assert.equal(result.filename, 'anasouza.json');
  const parsed = JSON.parse(result.json);
  assert.deepEqual(validateProgress(parsed), { ok: true, errors: [] });
  assert.equal(parsed.prework.blocks['1.1'], true);
  assert.equal(parsed.updatedAt, '2026-12-03T12:00:00.000Z');
  assert.equal(parsed.github, 'anasouza');
});

test('export filename is lowercase', () => {
  const { store } = storeWith();
  assert.equal(store.buildExport('AnaSouza', NOW).filename, 'anasouza.json');
});

test('export has no free-text exercise content', () => {
  const { store, storage } = storeWith({ '1.1': true });
  storage.setItem('r2s-prework-fields-v1', JSON.stringify({ b_nome: 'SEGREDO-123', pr_exemplo: 'OUTRO-456' }));
  storage.setItem('r2s-prework-answers-v1', JSON.stringify({ m1_llm: { 0: 1 } }));
  const { json } = store.buildExport('anasouza', NOW);
  assert.ok(!json.includes('SEGREDO') && !json.includes('OUTRO'));
  assert.deepEqual(Object.keys(JSON.parse(json)).sort(), ['github', 'prework', 'schema', 'selfAssessment', 'survey', 'updatedAt']);
});

test('import restores the state', () => {
  const { store } = storeWith();
  assert.deepEqual(store.importProgress(JSON.stringify(valid())), { ok: true });
  const loaded = store.load();
  assert.equal(loaded.github, 'anasouza');
  assert.equal(loaded.prework.blocks['2.1'], true);
  assert.deepEqual(loaded.prework.quizzes.m1_llm, { answered: 2, correct: 1 });
});

test('import rejects another schema version and keeps the state', () => {
  const { store } = storeWith({ '1.1': true });
  const result = store.importProgress(JSON.stringify(valid({ schema: 'r2s-progress/0' })));
  assert.deepEqual(result, { ok: false, error: 'Este arquivo é de outra versão do R2S Lab.' });
  assert.equal(store.load().prework.blocks['1.1'], true);
});

test('import rejects invalid JSON', () => {
  const { store } = storeWith();
  assert.deepEqual(store.importProgress('{nope'), { ok: false, error: 'O arquivo não é um JSON válido.' });
});

test('import rejects a file that breaks the contract', () => {
  const { store } = storeWith({ '1.1': true });
  const bad = valid();
  bad.prework.blocks['9.9'] = true;
  const result = store.importProgress(JSON.stringify(bad));
  assert.equal(result.ok, false);
  assert.match(result.error, /^O arquivo não segue o contrato: /);
  assert.equal(store.load().prework.blocks['1.1'], true);
});

/* ---------- Playwright: a página ---------- */

const setSliders = async (page, value) => {
  for (let i = 0; i < 8; i++) await page.fill(`#s_${i}`, String(value));
};

test('self-assessment average and route', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal((await page.locator('#s_avg').innerText()).trim(), '2,0');
    assert.match(await page.locator('#s_route').innerText(), /entrar direto na turma/);
    await setSliders(page, 1);
    assert.equal((await page.locator('#s_avg').innerText()).trim(), '1,0');
    assert.match(await page.locator('#s_route').innerText(), /Lab Zero/);
    await setSliders(page, 4);
    assert.equal((await page.locator('#s_avg').innerText()).trim(), '4,0');
    assert.match(await page.locator('#s_route').innerText(), /líder de squad/);
    assert.equal(await page.locator('#selfGrid input[type="range"]').count(), 8);
  });
});

test('self-assessment is only exported after the person touches it', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    const before = await page.evaluate(() => window.R2SStore.load().selfAssessment);
    assert.equal(before, null);
    await page.fill('#s_0', '3');
    const after = await page.evaluate(() => window.R2SStore.load().selfAssessment);
    assert.deepEqual(Object.keys(after).sort(), [...COMPETENCIES].sort());
    assert.equal(after.problemFraming, 3);
    assert.equal(after.valueCase, 2);
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.inputValue('#s_0'), '3');
  });
});

test('export is blocked without a username', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    await page.click('#export-btn');
    assert.equal((await page.locator('#export-msg').innerText()).trim(), 'Informe o seu usuário do GitHub.');
    assert.equal(downloaded, false);
  });
});

test('export downloads <user>.json', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#gh', 'AnaSouza');
    await page.check('input[data-block="1.1"]');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    assert.equal(download.suggestedFilename(), 'anasouza.json');
    const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(validateProgress(parsed), { ok: true, errors: [] });
    assert.equal(parsed.prework.blocks['1.1'], true);
    assert.match(await page.locator('#export-msg').innerText(), /anasouza\.json/);
  });
});

test('import restores a file after localStorage was cleared', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await page.check('input[data-block="2.1"]');
    await page.fill('#s_3', '4');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const file = await download.path();
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.isChecked('input[data-block="2.1"]'), false);
    await page.setInputFiles('#import-input', file);
    await page.waitForFunction(() => document.querySelector('#export-msg').textContent.trim() === 'Progresso importado.');
    assert.ok(await page.isChecked('input[data-block="2.1"]'));
    assert.equal(await page.inputValue('#gh'), 'anasouza');
    assert.equal(await page.inputValue('#s_3'), '4');
    assert.equal((await page.locator('#progHours').innerText()).trim(), '30 min');
  });
});

test('an invalid import shows an error and keeps the state', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.check('input[data-block="1.2"]');
    await page.setInputFiles('#import-input', {
      name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"x"}'),
    });
    await page.waitForFunction(() => document.querySelector('#export-msg').textContent.trim().length > 0);
    assert.equal((await page.locator('#export-msg').innerText()).trim(), 'Este arquivo é de outra versão do R2S Lab.');
    assert.ok(await page.isChecked('input[data-block="1.2"]'));
  });
});

test('imported quiz results survive later changes', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.setInputFiles('#import-input', {
      name: 'ana.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(valid())),
    });
    await page.waitForFunction(() => document.querySelector('#export-msg').textContent.trim() === 'Progresso importado.');
    await page.check('input[data-block="1.1"]');
    const saved = await page.evaluate(() => window.R2SStore.load().prework.quizzes.m1_llm);
    assert.deepEqual(saved, { answered: 2, correct: 1 });
    await page.reload({ waitUntil: 'load' });
    assert.equal((await page.locator('.quiz[data-quiz="m1_llm"] .score').innerText()).trim(), 'Acertos: 1 de 2');
  });
});

test('reset needs two clicks', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.check('input[data-block="1.1"]');
    await page.click('#reset-btn');
    assert.equal((await page.locator('#reset-btn').innerText()).trim(), 'Confirmar: apagar tudo');
    assert.ok(await page.isChecked('input[data-block="1.1"]'));
    await page.click('#reset-btn');
    await page.waitForFunction(() => document.querySelector('#progHours').textContent.trim() === '0 min');
    assert.equal(await page.isChecked('input[data-block="1.1"]'), false);
  });
});

test('the GitHub username persists', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#gh', 'anasouza');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.inputValue('#gh'), 'anasouza');
  });
});

test('the export carries the academy section only when it has something', async () => {
  const storeLib = (await import('../lib/store.js')).default;
  const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
  const s1 = storeLib.createStore(mem());
  assert.ok(!('academy' in JSON.parse(s1.buildExport('anasouza').json)));
  const st = s1.load();
  st.academy = { lidas: ['s2.1'], selos: { s2: '2026-11-25' } };
  s1.save(st);
  const out = JSON.parse(s1.buildExport('anasouza').json);
  assert.deepEqual(out.academy, { lidas: ['s2.1'], selos: { s2: '2026-11-25' } });
  assert.equal(s1.importProgress(JSON.stringify(out)).ok, true);
  assert.deepEqual(s1.load().academy, { lidas: ['s2.1'], selos: { s2: '2026-11-25' } });
});
