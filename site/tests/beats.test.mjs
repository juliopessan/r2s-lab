import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;
const trimAll = (xs) => xs.map((x) => x.replace(/\s+/g, ' ').trim());

test('the page follows hook, re-hook, meat and call to action, in this order', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const order = await page.evaluate(() => ['#hero .hook', '#porque', '#marca', '#como', '#principios', '#papeis', '#levar', '#final', '#comecar']
      .map((s) => document.querySelector(s))
      .every((el, i, all) => el && (i === 0 || Boolean(all[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))));
    assert.ok(order);
  });
});

test('the hero carries the hook and the teaser side by side on a wide screen', async () => {
  await withPage({ viewport: { width: 1280, height: 900 } }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal((await page.locator('#hero .hook').innerText()).trim(), '“Dá pra resolver isso com IA?”');
    assert.match(await page.locator('#hero .sub').innerText(), /12 semanas/);
    assert.match(await page.locator('#hero .kicker').innerText(), /DATA & AI/i);
    const [text, video] = await Promise.all([page.locator('.hero-texto').boundingBox(), page.locator('#teaser').boundingBox()]);
    assert.ok(video.x > text.x + text.width - 1, 'the teaser sits to the right of the hook');
    assert.ok(Math.abs(video.y - text.y) < 200, 'and on the same band');
  });
});

test('the re-hook states the problem and the numbers of the program', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal((await page.locator('#porque h2').innerText()).trim(), 'Curso não muda papel. Caso real muda.');
    const nums = trimAll(await page.locator('#porque .numeros li').allInnerTexts());
    assert.deepEqual(nums.map((t) => t.split(' ')[0]), ['12', '7', '5', '5', '6']);
  });
});

test('the meat keeps the method: 7 stages with 5 gates, 4 rules, 5 roles and 3 decisions', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.deepEqual(trimAll(await page.locator('#como .etapa-nome').allInnerTexts()), ['Intake', 'Discover', 'Frame Value', 'Design', 'Build', 'Evaluate', 'Pitch & Hand off']);
    assert.deepEqual(trimAll(await page.locator('#como .gate').allInnerTexts()), ['G0', 'G1', 'G2', 'G3', 'G4']);
    assert.deepEqual(trimAll(await page.locator('#principios h3').allInnerTexts()), ['Prove o valor.', 'Escolha o mais barato que funciona.', 'Meça.', 'Proteja.']);
    assert.match(await page.locator('#principios').innerText(), /3× o custo anual de execução/);
    assert.deepEqual(trimAll(await page.locator('.roles li').allInnerTexts()), ['Product Lead', 'Data Lead', 'AI Engineer', 'Eval & Risk Lead', 'Storyteller']);
    assert.deepEqual(trimAll(await page.locator('.decisions li').allInnerTexts()), ['Escalar', 'Iterar', 'Encerrar']);
    assert.equal(await page.locator('#levar li').count(), 4);
  });
});

test('both calls to action lead to the Academy', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const ctas = await page.locator('a.cta:not(.sec)').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    assert.deepEqual(ctas, ['../academy/index.html', '../academy/index.html']);
  });
});

test('the landing and the Academy share one theme file and one theme button', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('link[href="../css/theme.css"]').count(), 1);
    assert.equal(await page.locator('#tema-toggle.tema-btn .lua').count(), 1);
    assert.equal(await page.locator('#tema-toggle.tema-btn .sol').count(), 1);
    await page.goto(url.replace(/site\/$/, 'academy/index.html'), { waitUntil: 'load' });
    assert.equal(await page.locator('link[href="../css/theme.css"]').count(), 1);
    assert.equal(await page.locator('#tema-toggle.tema-btn .lua').count(), 1);
  });
});

test('the same choice gives the same colours on the landing and in the Academy', async () => {
  for (const scheme of ['light', 'dark']) {
    await withPage({}, async (page, url) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(url, { waitUntil: 'load' });
      const land = await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]);
      await page.goto(url.replace(/site\/$/, 'academy/index.html'), { waitUntil: 'load' });
      const ac = await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]);
      assert.deepEqual(land, ac, scheme);
    });
  }
});
