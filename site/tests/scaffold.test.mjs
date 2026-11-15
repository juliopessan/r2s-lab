import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;

test('page loads with lang, title and a single h1', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.getAttribute('html', 'lang'), 'pt-BR');
    assert.equal(await page.title(), 'R2S Lab — Reskilling too Skilling');
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal((await page.locator('h1').textContent()).trim(), 'R2S Lab');
    assert.equal(await page.locator('main#conteudo').count(), 1);
    assert.deepEqual(page.errors, []);
  });
});
