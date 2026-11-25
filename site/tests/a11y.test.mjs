import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const parseRgb = (s) => s.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);
export const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

test('no horizontal scroll at 360, 768 and 1280 px', async () => {
  for (const width of [360, 768, 1280]) {
    await withPage({ viewport: { width, height: 800 } }, async (page, url) => {
      await page.goto(url, { waitUntil: 'load' });
      const [scrollWidth, innerWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        window.innerWidth,
      ]);
      assert.ok(scrollWidth <= innerWidth, `${width}px: scrollWidth ${scrollWidth} > ${innerWidth}`);
    });
  }
});

test('video is usable at 360 px', async () => {
  await withPage({ viewport: { width: 360, height: 800 } }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const box = await page.locator('#teaser').boundingBox();
    assert.ok(box.width >= 320, `width ${box.width}`);
    assert.ok(box.height >= 180, `height ${box.height}`);
  });
});

for (const scheme of ['light', 'dark']) test(`contrast meets AA (${scheme})`, async () => {
  await withPage({}, async (page, url) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(url, { waitUntil: 'load' });
    const pairs = [
      ['.hero h1', 'body'],
      ['.tagline', 'body'],
      ['.support', 'body'],
      ['.secao h2', 'body'],
      ['.lede', 'body'],
      ['.principio p', '.principio'],
      ['.etapa-nome', '.etapas li'],
      ['.gate', '.gate'],
      ['.numeros .n', '.numeros li'],
      ['.numeros .l', '.numeros li'],
      ['.final h2', '.final'],
      ['.final p', '.final'],
      ['.final .cta', '.final .cta'],
      ['.topo-nav a', '.topo'],
      ['#marca .rs li:nth-child(2) .letter', '#marca .rs li'],
      ['#marca .rs li:nth-child(1) .letter', '#marca .rs li'],
      ['.word', '#marca .rs li'],
      ['.meaning', '#marca .rs li'],
      ['.roles li', '.roles li'],
      ['.foot-note', 'body'],
      ['.kicker', 'body'],
      ['.hook', 'body'],
      ['#cta-academy', '#cta-academy'],
      ['.levar .num', '.levar li'],
      ['.levar li span:last-child', '.levar li'],
      ['.rehook-texto p', 'body'],
      ['.tema-btn', '.tema-btn'],
    ];
    for (const [fgSel, bgSel] of pairs) {
      const [fg, bg] = await page.evaluate(
        ([a, b]) => [
          getComputedStyle(document.querySelector(a)).color,
          getComputedStyle(document.querySelector(b)).backgroundColor,
        ],
        [fgSel, bgSel],
      );
      const ratio = contrast(parseRgb(fg), parseRgb(bg));
      assert.ok(ratio >= 4.5, `${scheme} ${fgSel} on ${bgSel}: ${ratio.toFixed(2)}`);
    }
  });
});

test('reduced motion shows everything without animation', async () => {
  await withPage({ reducedMotion: 'reduce' }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const parts = await page.locator('.reveal').evaluateAll((els) =>
      els.map((e) => { const s = getComputedStyle(e); return [s.opacity, s.animationName, s.transitionDuration]; }));
    assert.ok(parts.length >= 6);
    for (const [opacity, animationName, transitionDuration] of parts) {
      assert.equal(opacity, '1');
      assert.equal(animationName, 'none');
      assert.ok(['0s', ''].includes(transitionDuration), `transition ${transitionDuration}`);
    }
    assert.equal(await page.locator('video').getAttribute('autoplay'), null);
  });
});

test('with motion allowed, sections become visible when scrolled into view', async () => {
  await withPage({ reducedMotion: 'no-preference' }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const ids = await page.locator('.reveal').evaluateAll((els) => els.map((e) => e.id));
    for (const id of ids) {
      await page.locator('#' + id).scrollIntoViewIfNeeded();
      await page.waitForFunction((n) => getComputedStyle(document.getElementById(n)).opacity === '1', id, { timeout: 5000 });
    }
  });
});

test('no JavaScript still shows every section', async () => {
  await withPage({ javaScriptEnabled: false }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const opacities = await page.locator('.reveal').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    assert.ok(opacities.every((o) => o === '1'));
  });
});

test('keyboard: skip link is first and focus is visible', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    const outline = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
    assert.ok(outline > 0, `skip link outline ${outline}`);

    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'conteudo');

    await page.goto(url, { waitUntil: 'load' });
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement.id === 'teaser')) break;
    }
    assert.equal(await page.evaluate(() => document.activeElement.id), 'teaser');
    const videoOutline = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
    assert.ok(videoOutline > 0, `video outline ${videoOutline}`);
  });
});

test('the reveal effect is on only when motion is allowed', async () => {
  for (const [reducedMotion, expected] of [['no-preference', true], ['reduce', false]]) {
    await withPage({ reducedMotion }, async (page, url) => {
      await page.goto(url, { waitUntil: 'load' });
      assert.equal(
        await page.evaluate(() => document.documentElement.classList.contains('reveal-ready')),
        expected,
        reducedMotion,
      );
    });
  }
});
