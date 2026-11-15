import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';
import progress from '../lib/progress.js';
import quizzes from '../js/quizzes.js';

const { withPage } = browser;
const { QUIZ_IDS } = progress;
const { QUIZZES, scoreQuiz } = quizzes;
const OPEN = '00-prework/index.html';
const FIRST = '.quiz[data-quiz="m1_llm"]';
const Q1 = QUIZZES.m1_llm[0];

test('has 19 questions across the nine quizzes', () => {
  assert.deepEqual(Object.keys(QUIZZES).sort(), [...QUIZ_IDS].sort());
  const counts = Object.fromEntries(Object.entries(QUIZZES).map(([id, set]) => [id, set.length]));
  assert.deepEqual(counts, {
    m1_llm: 2, m1_prompt: 1, m1_tech: 5, m2_mc: 2, m2_class: 4, m3_types: 1, m3_g1: 1, m3_adopt: 1, m4_rai: 2,
  });
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 19);
});

test('every answer index points to an option and every question has 2 to 4 options', () => {
  for (const set of Object.values(QUIZZES)) {
    for (const q of set) {
      assert.ok(q.o.length >= 2 && q.o.length <= 4, q.q);
      assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length, q.q);
      assert.ok(q.q && q.w, 'question and explanation are filled');
    }
  }
});

test('scoreQuiz counts correct and answered', () => {
  assert.deepEqual(scoreQuiz({ 0: 1, 1: 0 }, 'm1_llm'), { answered: 2, correct: 1 });
  assert.deepEqual(scoreQuiz({}, 'm1_llm'), { answered: 0, correct: 0 });
});

test('a correct answer is marked and explained', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.locator(`${FIRST} .q`).nth(0).locator('.opt').nth(Q1.a).click();
    assert.equal(await page.locator(`${FIRST} .q`).nth(0).locator('.opt.right').count(), 1);
    assert.match(await page.locator(`${FIRST} .q`).nth(0).locator('.fb').innerText(), /^Correto\./);
  });
});

test('a wrong answer shows the right one', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    const wrong = Q1.a === 0 ? 1 : 0;
    await page.locator(`${FIRST} .q`).nth(0).locator('.opt').nth(wrong).click();
    const q = page.locator(`${FIRST} .q`).nth(0);
    assert.equal(await q.locator('.opt.wrong').count(), 1);
    assert.equal(await q.locator('.opt.right').count(), 1);
    assert.ok((await q.locator('.fb').innerText()).startsWith(`Não é essa. A resposta é “${Q1.o[Q1.a]}”.`));
  });
});

test('score line', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.locator(`${FIRST} .q`).nth(0).locator('.opt').nth(Q1.a).click();
    assert.equal((await page.locator(`${FIRST} .score`).innerText()).trim(), 'Acertos: 1 de 2 (1 respondidas)');
  });
});

test('options are disabled after answering', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    const q = page.locator(`${FIRST} .q`).nth(0);
    await q.locator('.opt').nth(0).click();
    for (const disabled of await q.locator('.opt').evaluateAll((els) => els.map((e) => e.disabled))) {
      assert.equal(disabled, true);
    }
  });
});

test('answers persist and restore on reload', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.locator(`${FIRST} .q`).nth(0).locator('.opt').nth(Q1.a).click();
    await page.reload({ waitUntil: 'load' });
    const q = page.locator(`${FIRST} .q`).nth(0);
    assert.equal(await q.locator('.opt.right').count(), 1);
    assert.match(await q.locator('.fb').innerText(), /^Correto\./);
    assert.equal((await page.locator(`${FIRST} .score`).innerText()).trim(), 'Acertos: 1 de 2 (1 respondidas)');
  });
});

test('the store holds answered and correct per quiz', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.locator(`${FIRST} .q`).nth(0).locator('.opt').nth(Q1.a).click();
    const saved = await page.evaluate(() => window.R2SStore.load().prework.quizzes.m1_llm);
    assert.deepEqual(saved, { answered: 1, correct: 1 });
  });
});

test('all nine quizzes are rendered with 19 questions', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await page.locator('.quiz').count(), 9);
    assert.equal(await page.locator('.quiz .q').count(), 19);
  });
});
