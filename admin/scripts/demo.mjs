#!/usr/bin/env node
// Gera o painel com os dados de demonstração (tests/fixtures) e o serve por HTTP local.
// Uso: npm run demo   (a porta padrão é a 4173; PORT=0 escolhe uma livre)
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from '../src/build.mjs';
import { localFetchFile } from '../src/collect.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
};

export async function startDemo({ port = 4173, out } = {}) {
  const outDir = out || mkdtempSync(path.join(tmpdir(), 'r2s-demo-'));
  await build({
    rosterPath: path.join(FIXTURES, 'roster.csv'),
    outDir,
    config: { owner: 'local', target: 100, protectedHoursPerWeek: 6 },
    fetchFile: localFetchFile(FIXTURES),
  });

  const base = path.resolve(outDir);
  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      pathname = '/';
    }
    const file = path.resolve(base, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    if (!file.startsWith(base + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('não encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise((done) => { server.close(() => done()); server.closeAllConnections(); }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const demo = await startDemo({ port: process.env.PORT === undefined ? 4173 : Number(process.env.PORT) });
  console.log(`Painel de demonstração (dados sintéticos): ${demo.url}`);
  console.log('Ctrl+C para encerrar.');
}
