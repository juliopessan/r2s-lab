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

test('the 7 stages: the dot runs across the cards and the page ends exactly like the static layout', async () => {
  const estatico = async (page) => page.locator('#como .etapas li').evaluateAll((lis) => lis.map((li) => [getComputedStyle(li).borderTopColor, li.querySelector('.gate') ? getComputedStyle(li.querySelector('.gate')).opacity : null]));
  let semMovimento;
  await withPage({ reducedMotion: 'reduce' }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('.etapa-ponto').count(), 0, 'no dot without motion');
    semMovimento = await estatico(page);
  });
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('#como .etapa-ponto').count(), 7);
    await page.locator('#como').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#como .etapas').dataset.estado === 'final', null, { timeout: 8000 });
    const trilhos = await page.locator('#como .etapa-trilho').evaluateAll((t) => t.map((x) => [getComputedStyle(x).backgroundColor, x.style.transform]));
    assert.deepEqual(trilhos.map((t) => t[1]), Array(7).fill('scaleX(1)'));
    const gates = await page.locator('#como .gate').evaluateAll((g) => g.map((x) => x.style.opacity));
    assert.deepEqual(gates, ['1', '1', '1', '1', '1']);
    const cores = trilhos.map((t) => t[0]);
    assert.deepEqual(cores.map((c, i) => c === cores[0]), [true, false, true, true, false, true, true], 'orange only on the gate cards');
    assert.deepEqual(semMovimento.map((x) => x[1]), ['1', null, '1', '1', null, '1', '1']);
    assert.deepEqual(page.errors, []);
  });
});

test('roles hub: the five roles turn around the squad, one step per gate, ending at G4', async () => {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    await withPage({ reducedMotion }, async (page, url) => {
      await page.goto(url, { waitUntil: 'load' });
      await page.locator('#papeis').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[data-hub]').dataset.estado === 'final', null, { timeout: 9000 });
      assert.equal(await page.locator('[data-hub] .hub-gate').textContent(), 'G4', reducedMotion);
      assert.deepEqual(await page.locator('[data-hub] .hub-papel').allTextContents(), ['Product Lead', 'Data Lead', 'AI Engineer', 'Eval & Risk Lead', 'Storyteller']);
      assert.deepEqual(await page.locator('[data-hub] .hub-papel.on').allTextContents(), ['Data Lead'], 'after four turns you hold a different role');
      assert.equal(await page.locator('[data-hub] svg').getAttribute('aria-hidden'), 'true');
      assert.deepEqual(page.errors, []);
    });
  }
});

test('final call: "Menos curso." struck through and a giant "Mais lab." whose period is the orange dot', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.locator('#final').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#final .kin').dataset.estado === 'final', null, { timeout: 8000 });
    assert.equal((await page.locator('.kin-menos').textContent()).trim(), 'Menos curso.');
    assert.equal((await page.locator('.kin-mais').textContent()).trim(), 'Mais lab');
    assert.equal(await page.locator('.kin-ponto').evaluate((e) => getComputedStyle(e).opacity), '1');
    assert.equal(await page.locator('.kin-menos').evaluate((e) => e.style.getPropertyValue('--risco')), '1.000');
    assert.equal(await page.locator('.kin').getAttribute('aria-hidden'), 'true');
    assert.equal((await page.locator('#final-titulo').textContent()).trim(), 'Comece pela Academy.');
  });
});

test('footer mark: the orange dot hops over R, 2 and S and lands as the period', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.marca-r2s').dataset.estado === 'final', null, { timeout: 6000 });
    const r = await page.evaluate(() => {
      const p = document.querySelector('.marca-r2s .mr-ponto').getBoundingClientRect();
      const s = [...document.querySelectorAll('.marca-r2s .mr-l')].pop().getBoundingClientRect();
      return { depoisDoS: p.left >= s.right - 1, naLinha: p.bottom <= s.bottom + 2 && p.bottom >= s.bottom - 0.35 * s.height };
    });
    assert.deepEqual(r, { depoisDoS: true, naLinha: true });
    assert.deepEqual(page.errors, []);
  });
});

test('demo day: the chart draws, the audience arrives and the cursor clicks Escalar', async () => {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    await withPage({ reducedMotion }, async (page, url) => {
      await page.goto(url, { waitUntil: 'load' });
      await page.locator('#papeis').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[data-demo]').dataset.estado === 'final', null, { timeout: 9000 });
      assert.deepEqual(await page.locator('[data-demo] .decisions li').allTextContents(), ['Escalar', 'Iterar', 'Encerrar']);
      assert.deepEqual(await page.locator('[data-demo] .decisions li.on').allTextContents(), ['Escalar']);
      assert.ok((await page.locator('.demo-curva').getAttribute('d')).length > 200, 'the curve is drawn');
      assert.equal(await page.locator('.demo-cursor').evaluate((c) => c.style.opacity), reducedMotion === 'reduce' ? '0' : '1');
      assert.deepEqual(page.errors, []);
    });
  }
});

test('the roles and demo columns line up: titles, texts and scenes start on the same rows', async () => {
  await withPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const tops = await page.evaluate(() => {
      const [a, b] = document.querySelectorAll('#papeis .dupla > div');
      return ['h2', '.lede'].map((s) => Math.round(a.querySelector(s).getBoundingClientRect().top - b.querySelector(s).getBoundingClientRect().top));
    });
    assert.deepEqual(tops, [0, 0]);
  });
});
