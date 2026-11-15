import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import browser from './helpers/browser.cjs';

const { withPage } = browser;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPEN = '05-encerramento/certificado.html';
const text = async (page, sel) => (await page.locator(sel).innerText()).replace(/\s+/g, ' ').trim();

const DEFAULT_TEXT =
  'concluiu o R2S Lab, laboratório de IA aplicada a negócio, entregando um caso real com métrica, baseline, avaliação, custo por transação e uma recomendação de decisão ao painel executivo.';

test('the preview shows the typed name, and a placeholder when empty', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await text(page, '#cv_nome'), 'Nome do colaborador');
    await page.fill('#c_nome', 'Ana Souza');
    assert.equal(await text(page, '#cv_nome'), 'Ana Souza');
  });
});

test('the defaults come filled in', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await page.inputValue('#c_texto'), DEFAULT_TEXT);
    assert.equal(await page.inputValue('#c_comp'), 'Problem framing · Value case · Seleção de técnica · Avaliação · Responsible AI e FinOps');
    assert.equal(await page.inputValue('#c_r1'), 'Coordenação do R2S Lab');
    assert.match(await text(page, '#cv_texto'), /concluiu o R2S Lab/);
  });
});

test('class and hours are appended to the text when filled', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.ok(!(await text(page, '#cv_texto')).includes('Turma'));
    await page.fill('#c_turma', '3');
    await page.fill('#c_horas', '72');
    const shown = await text(page, '#cv_texto');
    assert.ok(shown.includes('Turma 3.'), shown);
    assert.ok(shown.includes('Carga horária: 72 horas.'), shown);
  });
});

test('the date is written in Portuguese', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#c_data', '2026-12-03');
    assert.equal(await text(page, '#cv_data'), '3 de dezembro de 2026');
  });
});

test('the chosen level shows and hides with the select', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.deepEqual(await page.locator('#c_nivel option').allInnerTexts(), ['—', 'Foundation', 'Practitioner', 'Lead']);
    assert.equal(await page.locator('#cv_nivel').isVisible(), false);
    await page.selectOption('#c_nivel', { label: 'Practitioner' });
    assert.equal(await page.locator('#cv_nivel').textContent(), 'Nível: Practitioner');
    await page.selectOption('#c_nivel', { index: 0 });
    assert.equal(await page.locator('#cv_nivel').isVisible(), false);
  });
});

test('a signature with no name and no role is hidden', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await page.locator('#cv_s2').isVisible(), false, 'second signature starts empty');
    await page.fill('#c_s2', 'Maria Lima');
    assert.equal(await page.locator('#cv_s2').isVisible(), true);
    assert.equal(await text(page, '#cv_s2'), 'Maria Lima');
    await page.fill('#c_s2', '');
    await page.fill('#c_r2', '');
    assert.equal(await page.locator('#cv_s2').isVisible(), false);
  });
});

test('the print button calls window.print', async () => {
  await withPage({}, async (page, url) => {
    await page.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.click('#printBtn');
    assert.equal(await page.evaluate(() => window.__printed), 1);
  });
});

test('the draft survives a reload and never reaches the exportable store', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#c_nome', 'Ana Souza');
    await page.fill('#c_turma', '3');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.inputValue('#c_nome'), 'Ana Souza');
    assert.equal(await text(page, '#cv_nome'), 'Ana Souza');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    assert.ok(keys.includes('r2s-cert-draft-v1'), keys.join());
    assert.ok(!keys.includes('r2s-lab-progress-v1'), 'the progress store stays untouched');
    assert.ok(!(await page.evaluate(() => localStorage.getItem('r2s-lab-progress-v1') || '')).includes('Ana'));
  });
});

test('the rule about who may receive a certificate is on the page', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.match(await text(page, '#regra'), /Emita só para quem cumpriu os critérios/);
  });
});

test('the print stylesheet is A4 landscape and hides the interface', () => {
  const css = readFileSync(path.join(root, 'css', 'lab.css'), 'utf8');
  assert.match(css, /@page\s*\{[^}]*A4 landscape/);
  assert.match(css, /@media print[^{]*\{[\s\S]*\.noprint\s*\{[^}]*display:\s*none/);
});

test('the page makes no external request and does not scroll sideways at 360 px', async () => {
  await withPage({ viewport: { width: 360, height: 800 } }, async (page, url) => {
    const external = [];
    page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:')) external.push(r.url()); });
    await page.goto(url + OPEN, { waitUntil: 'load' });
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(sw <= iw, `${sw} > ${iw}`);
    assert.deepEqual(external, []);
  });
});

test('the interface has visible focus and the paper stays light', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    for (const sel of ['#c_nome', '#c_nivel', '#printBtn']) {
      await page.focus(sel);
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const w = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
      assert.ok(w > 0, `${sel}: ${w}`);
    }
    const paper = await page.evaluate(() => getComputedStyle(document.querySelector('#cert')).backgroundColor);
    const [r, g, b] = paper.match(/\d+/g).map(Number);
    assert.ok(r > 240 && g > 240 && b > 230, paper);
  });
});
