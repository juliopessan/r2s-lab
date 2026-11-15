import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;

const MEANINGS = [
  'Quem muda de papel aprende fazendo, em um caso real.',
  'O mesmo laboratório recebe quem se recicla e quem se aprofunda.',
  'Quem evolui no papel atual leva o caso até a decisão do negócio.',
];

test('shows the three letters in order', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const letters = await page.locator('#marca .letter').allTextContents();
    assert.deepEqual(letters.map((t) => t.trim()), ['R', '2', 'S']);
    const meanings = await page.locator('#marca .meaning').allTextContents();
    assert.deepEqual(meanings.map((t) => t.trim()), MEANINGS);
    const words = await page.locator('#marca .word').allTextContents();
    assert.deepEqual(words.map((t) => t.trim()), ['Reskilling', 'too', 'Skilling']);
  });
});

test('the 2 carries the brand accent', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const colors = await page
      .locator('#marca .letter')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    assert.deepEqual(colors, ['rgb(242, 244, 247)', 'rgb(255, 88, 0)', 'rgb(242, 244, 247)']);
  });
});

test('group has an accessible name', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const region = page.getByRole('region', { name: 'R2S Lab — Reskilling too Skilling' });
    assert.equal(await region.count(), 1);
    assert.equal(await region.getAttribute('id'), 'marca');
  });
});

test('uses no forbidden wording', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const text = await page.locator('#marca').innerText();
    assert.ok(!text.includes('Requirement-to-Solution'));
  });
});
