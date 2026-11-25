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

test('the 2 carries the brand accent in both themes', async () => {
  for (const [scheme, fg, accent] of [['dark', 'rgb(242, 244, 247)', 'rgb(255, 88, 0)'], ['light', 'rgb(51, 51, 51)', 'rgb(180, 60, 20)']]) {
    await withPage({}, async (page, url) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(url, { waitUntil: 'load' });
      const colors = await page
        .locator('#marca .letter')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
      assert.deepEqual(colors, [fg, accent, fg], scheme);
    });
  }
});

test('the theme button switches light and dark and the Academy reads the same choice', async () => {
  await withPage({}, async (page, url) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(url, { waitUntil: 'load' });
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(await bg(), 'rgb(255, 255, 255)');
    assert.equal(await page.getAttribute('#tema-toggle', 'aria-label'), 'Alternar entre tema claro e escuro');
    await page.click('#tema-toggle');
    assert.equal(await bg(), 'rgb(14, 17, 22)');
    assert.equal(await page.evaluate(() => localStorage.getItem('r2s-academy-theme')), 'dark');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await bg(), 'rgb(14, 17, 22)', 'the choice survives a reload');
  });
});

test('the copy follows hook, re-hook, meat and call to action, and leads to the Academy', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.match(await page.locator('.hook').innerText(), /Dá pra resolver isso com IA\?/);
    assert.match(await page.locator('.kicker').innerText(), /Data & AI/);
    const order = await page.evaluate(() => ['.hook', '#rehook', '#marca', '.beat[data-beat="8"]', '#levar', '#final', '#comecar']
      .map((s) => document.querySelector(s))
      .every((el, i, all) => i === 0 || Boolean(all[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.ok(order, 'hook, re-hook, meat, call to action and the repository steps come in order');
    const ctas = await page.locator('a.cta:not(.sec)').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    assert.deepEqual(ctas, ['../academy/index.html', '../academy/index.html']);
    assert.equal(await page.locator('#levar li').count(), 4);
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
