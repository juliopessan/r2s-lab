import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;

test('video has controls, poster, captions and no autoplay', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const video = page.locator('video#teaser');
    assert.equal(await video.count(), 1);
    for (const attr of ['controls', 'playsinline']) {
      assert.notEqual(await video.getAttribute(attr), null, `missing ${attr}`);
    }
    assert.equal(await video.getAttribute('preload'), 'metadata');
    assert.equal(await video.getAttribute('autoplay'), null);
    assert.match(await video.getAttribute('poster'), /assets\/teaser-poster\.jpg$/);
    assert.match(
      await page.locator('video#teaser source[type="video/mp4"]').getAttribute('src'),
      /assets\/teaser\.mp4$/,
    );
    const track = page.locator('video#teaser track[kind="captions"][srclang="pt-BR"][default]');
    assert.equal(await track.count(), 1);
    assert.match(await track.getAttribute('src'), /assets\/teaser\.pt-BR\.vtt$/);
  });
});

test('video loads metadata and lasts about 91 seconds', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#teaser').readyState >= 1, null, {
      timeout: 15000,
    });
    const duration = await page.evaluate(() => document.querySelector('#teaser').duration);
    assert.ok(duration >= 91 && duration <= 92, `duration is ${duration}`);
  });
});

test('the teaser has no caption links under it; captions and the no-video fallback stay', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('#hero .video-links, #hero figcaption').count(), 0);
    assert.equal(await page.locator('#teaser track[kind="captions"]').count(), 1);
    assert.equal(await page.locator('#teaser a[href$="assets/teaser.mp4"]').count(), 1);
  });
});

test('hero is readable with JavaScript disabled', async () => {
  await withPage({ javaScriptEnabled: false }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.ok(await page.locator('#hero h1').isVisible());
    assert.ok(await page.locator('#hero .tagline').isVisible());
    assert.equal((await page.locator('#hero .tagline').textContent()).trim(), 'Reskilling too Skilling');
    assert.ok(await page.locator('#hero video#teaser').isVisible());
  });
});
