import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';
import progress from '../lib/progress.js';

const { withPage } = browser;
const { PREWORK_BLOCKS } = progress;
const OPEN = '00-prework/index.html';

test('renders five parts and thirteen blocks with the contract ids, titles and minutes', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal(await page.title(), 'Pre-work R2S Lab');
    assert.equal(await page.locator('section.part[id^="p"]').count(), 5);
    assert.equal(await page.locator('section#exportar').count(), 1);
    const blocks = await page.locator('article.block').evaluateAll((els) =>
      els.map((e) => ({
        id: e.querySelector('input[data-block]').dataset.block,
        min: Number(e.querySelector('input[data-block]').dataset.min),
        title: e.querySelector('h3').textContent.trim(),
      })));
    assert.deepEqual(
      blocks,
      PREWORK_BLOCKS.map((b) => ({ id: b.id, min: b.min, title: `${b.id} ${b.title}` })),
    );
  });
});

test('progress starts at zero', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.equal((await page.locator('#progHours').textContent()).trim(), '0 min');
    assert.equal((await page.locator('#progPct').textContent()).trim(), '0%');
    assert.equal(await page.getAttribute('#progBar', 'aria-valuenow'), '0');
    assert.equal(await page.getAttribute('#progBar', 'aria-valuemax'), '480');
  });
});

test('checking 1.1 and 1.2 shows 1 h 45 min', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.check('input[data-block="1.1"]');
    await page.check('input[data-block="1.2"]');
    assert.equal((await page.locator('#progHours').textContent()).trim(), '1 h 45 min');
    assert.equal((await page.locator('#progPct').textContent()).trim(), '22%');
    assert.equal(await page.getAttribute('#progBar', 'aria-valuenow'), '105');
  });
});

test('progress survives a reload', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.check('input[data-block="2.1"]');
    await page.reload({ waitUntil: 'load' });
    assert.ok(await page.isChecked('input[data-block="2.1"]'));
    assert.equal((await page.locator('#progHours').textContent()).trim(), '30 min');
  });
});

test('works with localStorage blocked', async () => {
  const init = "Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });";
  await withPage({ init }, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    await page.check('input[data-block="1.1"]');
    assert.equal((await page.locator('#progHours').textContent()).trim(), '45 min');
    assert.deepEqual(page.errors, []);
  });
});

test('makes no external requests', async () => {
  await withPage({}, async (page, url) => {
    const seen = [];
    page.on('request', (r) => seen.push(r.url()));
    await page.goto(url + OPEN, { waitUntil: 'load' });
    const foreign = seen.filter((u) => !u.startsWith(url) && !u.startsWith('data:'));
    assert.deepEqual(foreign, []);
  });
});

test('contains no forbidden wording', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + OPEN, { waitUntil: 'load' });
    assert.ok(!(await page.locator('body').innerText()).includes('Requirement-to-Solution'));
  });
});
