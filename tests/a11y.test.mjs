import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;
const PAGES = ['00-prework/index.html', '05-encerramento/pesquisa.html'];

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const parseRgba = (s) => (s.match(/[\d.]+/g) || []).map(Number);
const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

/** Cor de texto e cor de fundo efetiva (sobe pelos pais até achar um fundo opaco). */
const colors = (selector) => (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  let bg = null;
  for (let n = el; n && !bg; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    const m = c.match(/[\d.]+/g).map(Number);
    if (m.length < 4 || m[3] > 0.99) bg = m.slice(0, 3);
  }
  return { fg: getComputedStyle(el).color, bg: bg || [14, 17, 22] };
};

for (const path of PAGES) {
  test(`${path}: no horizontal scroll at 360 px`, async () => {
    await withPage({ viewport: { width: 360, height: 800 } }, async (page, url) => {
      await page.goto(url + path, { waitUntil: 'load' });
      const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert.ok(scrollWidth <= innerWidth, `${path}: scrollWidth ${scrollWidth} > ${innerWidth}`);
    });
  });

  test(`${path}: contrast meets AA`, async () => {
    await withPage({}, async (page, url) => {
      await page.goto(url + path, { waitUntil: 'load' });
      const selectors = [
        'body', '.lede', '.kick', '.notice p', '.pmeta', '.goal', 'small', '.muted', 'legend', '.ends span',
        '.rating-label', '.btn', '.btn.sec', 'label.f', '.tool h4', 'footer', '.refs a', '.chips li', '.min', '.do',
      ];
      let checked = 0;
      for (const sel of selectors) {
        const found = await page.evaluate(colors(sel), sel);
        if (!found) continue;
        checked++;
        const ratio = contrast(parseRgba(found.fg).slice(0, 3), found.bg);
        assert.ok(ratio >= 4.5, `${path} ${sel}: ${ratio.toFixed(2)}`);
      }
      assert.ok(checked >= 8, `only ${checked} selectors were present`);
    });
  });

  test(`${path}: focus is visible on buttons and inputs`, async () => {
    await withPage({}, async (page, url) => {
      await page.goto(url + path, { waitUntil: 'load' });
      for (const sel of ['#export-btn', '#reset-btn', '#gh', '#import-input']) {
        await page.focus(sel);
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const width = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
        assert.ok(width > 0, `${path} ${sel}: outline ${width}`);
      }
    });
  });

  test(`${path}: reduced motion has no transitions`, async () => {
    await withPage({ reducedMotion: 'reduce' }, async (page, url) => {
      await page.goto(url + path, { waitUntil: 'load' });
      const moving = await page.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter((e) => parseFloat(getComputedStyle(e).transitionDuration) > 0
            || getComputedStyle(e).animationName !== 'none')
          .map((e) => e.tagName + (e.id ? '#' + e.id : '')));
      assert.deepEqual(moving, []);
    });
  });
}
