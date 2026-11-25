import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;

test('the R · 2 · S acronym section is gone; the name lives in the hero tagline', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('#marca, .rs, .letter').count(), 0);
    assert.equal(await page.getByRole('region', { name: 'R · 2 · S' }).count(), 0);
    assert.equal((await page.locator('#hero .tagline').textContent()).trim(), 'Reskilling too Skilling');
  });
});

test('the theme button switches light and dark and the Academy reads the same choice', async () => {
  await withPage({}, async (page, url) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(url, { waitUntil: 'load' });
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(await bg(), 'rgb(255, 255, 255)');
    assert.equal(await page.getAttribute('#tema-toggle', 'aria-label'), 'Alternar entre tema claro e escuro');
    await page.click('#tema-toggle');
    assert.equal(await bg(), 'rgb(0, 0, 0)');
    assert.equal(await page.evaluate(() => localStorage.getItem('r2s-academy-theme')), 'dark');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await bg(), 'rgb(0, 0, 0)', 'the choice survives a reload');
  });
});

test('uses no forbidden wording', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const text = await page.locator('main').innerText();
    assert.ok(!text.includes('Requirement-to-Solution'));
  });
});
