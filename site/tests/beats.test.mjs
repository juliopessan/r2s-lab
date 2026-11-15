import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;

const BEATS = [
  ['Menos curso. Mais lab.', 'Cada squad leva um requisito real do negócio até uma solução pronta para demonstrar, em vez de assistir a aulas.'],
  ['7 etapas. 5 gates. 12 semanas.', 'Intake, Discover, Frame Value, Design, Build, Evaluate e Pitch & Hand off. O avanço depende de evidência, não do calendário. Squads de 5 pessoas, com 6 horas protegidas por semana.'],
  ['Prove o valor.', 'Nenhum caso entra sem patrocinador, métrica e baseline. No G1, o valor anual precisa superar 3× o custo anual de execução.'],
  ['Escolha o mais barato que funciona.', 'Regra ou SQL antes de ML, ML antes de LLM, uma chamada de LLM antes de um agente.'],
  ['Meça.', 'O golden set vem antes do primeiro prompt, e cada solução reporta o custo por transação.'],
  ['Proteja.', 'Avaliação de impacto, red-team e uma pessoa nomeada como responsável por cada decisão do algoritmo.'],
  ['A cada gate, um novo papel.', 'Os papéis giram a cada gate:'],
  ['Demo day. O negócio decide.', 'Dez minutos para pedir uma decisão:'],
];

const trimAll = (list) => list.map((t) => t.trim());

test('renders eight beats in order with the exact headings', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('section.beat').count(), 8);
    assert.deepEqual(
      await page.locator('section.beat').evaluateAll((els) => els.map((e) => e.dataset.beat)),
      ['1', '2', '3', '4', '5', '6', '7', '8'],
    );
    assert.deepEqual(trimAll(await page.locator('.beat h2').allTextContents()), BEATS.map((b) => b[0]));
  });
});

test('each beat has a support paragraph with the exact text', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.deepEqual(trimAll(await page.locator('.beat p.support').allTextContents()), BEATS.map((b) => b[1]));
  });
});

test('roles and decisions lists', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.deepEqual(trimAll(await page.locator('.beat[data-beat="7"] ul.roles li').allTextContents()), [
      'Product Lead', 'Data Lead', 'AI Engineer', 'Eval & Risk Lead', 'Storyteller',
    ]);
    assert.deepEqual(trimAll(await page.locator('.beat[data-beat="8"] ul.decisions li').allTextContents()), [
      'Escalar', 'Iterar', 'Encerrar',
    ]);
  });
});

test('beats appear after the brand block', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const follows = await page.evaluate(() => {
      const brand = document.querySelector('#marca');
      const first = document.querySelector('.beat[data-beat="1"]');
      return Boolean(brand.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.ok(follows);
  });
});
