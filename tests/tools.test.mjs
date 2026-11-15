import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;
const OPEN = '00-prework/index.html';
const norm = (s) => s.replace(/ /g, ' ').trim();
const text = async (page, sel) => norm(await page.locator(sel).innerText());

test('prompt builder assembles the six parts', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    const prompt = await page.locator('#pr_out').textContent();
    assert.ok(prompt.startsWith('Você é analista de FP&A que explica números para executivos.'));
    assert.ok(prompt.includes('Contexto: '));
    assert.ok(prompt.includes('Tarefa: '));
    assert.ok(prompt.includes('Formato da resposta: '));
    assert.ok(!prompt.includes('Exemplo de uma boa resposta'));
    assert.equal(await text(page, '#pr_stat'), `5 de 6 partes preenchidas · ${prompt.length} caracteres`);
    await page.fill('#pr_exemplo', 'Resposta modelo.');
    assert.ok((await page.locator('#pr_out').textContent()).includes('Exemplo de uma boa resposta:\nResposta modelo.'));
    assert.match(await text(page, '#pr_stat'), /^6 de 6 partes preenchidas/);
  });
});

test('default cost example', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await text(page, '#c_tx'), 'R$ 0,04');
    assert.equal(await text(page, '#c_mo'), 'R$ 200,00');
    assert.equal(await text(page, '#c_yr'), 'R$ 2.400,00');
  });
});

test('six calls change the cost', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#c_calls', '6');
    assert.equal(await text(page, '#c_tx'), 'R$ 0,24');
    assert.equal(await text(page, '#c_mo'), 'R$ 1.200,00');
  });
});

test('default value example does not pass G1', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await text(page, '#v_val'), 'R$ 151.200,00');
    assert.equal(await text(page, '#v_thr'), 'R$ 180.000,00');
    assert.equal(await text(page, '#v_mul'), '2,52×');
    const verdict = await text(page, '#v_ver');
    assert.ok(verdict.includes('Ainda não passa no G1.'));
    assert.ok(verdict.includes('R$ 28.800,00'));
    assert.ok(verdict.includes('R$ 50.400,00'));
  });
});

test('lowering run cost passes G1', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#v_run', '40000');
    const verdict = await text(page, '#v_ver');
    assert.ok(verdict.startsWith('Passa no G1.'));
    assert.ok(verdict.includes('R$ 31.200,00'));
  });
});

test('run cost zero asks for input', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#v_run', '0');
    assert.equal(await text(page, '#v_ver'), 'Informe o custo anual de run para comparar.');
    assert.equal(await text(page, '#v_mul'), '—');
  });
});

test('ask line', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await text(page, '#ask_out'), 'Escolha uma decisão e diga o que é preciso.');
    await page.selectOption('#ask_dec', 'Escalar');
    await page.fill('#ask_need', 'dois meses de um engenheiro');
    assert.equal(await text(page, '#ask_out'), 'Peço que o painel decida escalar este caso: dois meses de um engenheiro.');
  });
});

test('brief counter', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await text(page, '#b_stat'), '0 de 10 campos preenchidos');
    await page.fill('#b_nome', 'Fechamento do caixa');
    await page.fill('#b_decide', 'Controller, até março');
    await page.fill('#b_req', 'O fechamento leva 4 horas.');
    assert.equal(await text(page, '#b_stat'), '3 de 10 campos preenchidos');
  });
});

test('copy prompt reports success when the clipboard works', async () => {
  await withPage({ permissions: ['clipboard-read', 'clipboard-write'] }, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.click('#pr_copy');
    await page.waitForFunction(() => document.querySelector('#pr_stat').textContent.trim() === 'Copiado.');
    assert.ok((await page.evaluate(() => navigator.clipboard.readText())).startsWith('Você é analista'));
  });
});

test('copy prompt falls back without clipboard', async () => {
  const init = "Object.defineProperty(navigator, 'clipboard', { value: undefined });";
  await withPage({ init }, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.click('#pr_copy');
    assert.equal(await text(page, '#pr_stat'), 'Selecione o texto e copie com Ctrl+C (ou Cmd+C).');
  });
});

test('typed fields persist but never reach the exportable store', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.fill('#b_nome', 'SEGREDO-123');
    await page.fill('#pr_exemplo', 'OUTRO-SEGREDO-456');
    await page.check('input[data-block="1.1"]');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.inputValue('#b_nome'), 'SEGREDO-123');
    assert.equal(await page.inputValue('#pr_exemplo'), 'OUTRO-SEGREDO-456');
    const exportable = await page.evaluate(() => JSON.stringify(window.R2SStore.load()));
    assert.ok(!exportable.includes('SEGREDO'));
    assert.ok(exportable.includes('"1.1":true'));
  });
});
