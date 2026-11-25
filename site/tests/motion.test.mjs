import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';
import { spring } from '../js/motion.js';

/* Sistema do ponto laranja: cenas nos cards das quatro regras e contagem com mola nos números. */
const { withPage } = browser;

test('the spring overshoots a little and settles on the target', () => {
  let pico = 0;
  for (let t = 0; t <= 2; t += 0.005) pico = Math.max(pico, spring(t));
  assert.ok(pico > 1.1 && pico < 1.35, `overshoot ${pico}`);
  assert.equal(spring(0), 0);
  assert.ok(Math.abs(spring(2) - 1) < 0.005);
});

test('with reduced motion every card shows its final frame and the numbers are final', async () => {
  await withPage({ reducedMotion: 'reduce' }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const cenas = await page.locator('.principio svg.mo').evaluateAll((s) => s.map((x) => [x.closest('[data-cena]').dataset.cena, x.dataset.estado]));
    assert.deepEqual(cenas, [['valor', 'final'], ['barato', 'final'], ['medir', 'final'], ['proteger', 'final']]);
    assert.equal(await page.locator('.mo .mo-barra.on').count(), 1, 'the cheapest option is lit');
    assert.match(await page.locator('[data-cena="medir"] .mo-ink').textContent(), /^acerto 9\d%$/);
    const nums = await page.locator('.numeros .n').allTextContents();
    assert.deepEqual(nums, ['12', '7', '5', '5', '6']);
    assert.deepEqual(page.errors, []);
  });
});

test('with motion allowed the scenes play when scrolled into view and end on the same final frame', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('.levar .num').first().textContent(), '0 h', 'counters wait off screen');
    await page.locator('#principios').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.principio svg.mo')].every((s) => s.dataset.estado === 'final'), null, { timeout: 8000 });
    assert.equal(await page.locator('.mo .mo-barra.on').count(), 1);
    assert.equal(await page.locator('[data-cena="proteger"] .mo-forma-txt').evaluate((n) => n.style.opacity), '1');
    await page.locator('#levar').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.levar .num').textContent === '8 h', null, { timeout: 5000 });
    assert.deepEqual(page.errors, []);
  });
});

test('the scenes are decoration: hidden from assistive tech and never focusable', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const attrs = await page.locator('svg.mo').evaluateAll((s) => s.map((x) => [x.getAttribute('aria-hidden'), x.getAttribute('focusable')]));
    assert.equal(attrs.length, 4);
    for (const a of attrs) assert.deepEqual(a, ['true', 'false']);
  });
});
