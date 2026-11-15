'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const SITE_ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function handler(root) {
  return (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    const size = fs.statSync(file).size;
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
      const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
      res.writeHead(206, {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size });
    fs.createReadStream(file).pipe(res);
  };
}

/** Static server for the site. Resolves with the base url and a close function. */
function startServer(root = SITE_ROOT) {
  return new Promise((resolve) => {
    const server = http.createServer(handler(path.resolve(root)));
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

/**
 * Opens a page against a fresh static server.
 * opts: { viewport?, javaScriptEnabled?, reducedMotion?, permissions?, init?, root? } (root = pasta servida)
 * `page.errors` collects console errors and uncaught page errors.
 */
async function withPage(opts, fn) {
  const { viewport, javaScriptEnabled, reducedMotion, permissions, init, root } = opts || {};
  const server = await startServer(root);
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  try {
    const context = await browser.newContext({
      viewport: viewport || { width: 1280, height: 800 },
      javaScriptEnabled: javaScriptEnabled !== false,
      reducedMotion: reducedMotion || 'no-preference',
      permissions: permissions || [],
    });
    if (init) await context.addInitScript(init);
    const page = await context.newPage();
    page.errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') page.errors.push(m.text());
    });
    page.on('pageerror', (e) => page.errors.push(String(e)));
    await fn(page, server.url);
  } finally {
    await browser.close();
    await server.close();
  }
}

module.exports = { startServer, withPage };
