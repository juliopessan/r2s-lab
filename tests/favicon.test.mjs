import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* O favicon R2S. (tools/build-favicon.py) está em todas as páginas; o painel leva uma cópia idêntica. */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGINAS = ['site/index.html', 'academy/index.html', 'academy/curso.html', 'academy/licao.html', 'academy/selo.html',
  'academy/jornada.html', '00-prework/index.html', '05-encerramento/pesquisa.html', '05-encerramento/certificado.html', 'admin/dashboard/index.html'];
const ARQUIVOS = ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'];

test('every page links the ico, the svg and the touch icon, and the files exist', () => {
  for (const p of PAGINAS) {
    const html = readFileSync(path.join(root, p), 'utf8');
    const hrefs = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs.map((h) => path.basename(h)), ARQUIVOS, p);
    for (const h of hrefs) assert.ok(existsSync(path.join(root, path.dirname(p), h)), `${p} → ${h}`);
  }
});

test('the svg favicon is the R2S. mark in outlines and follows the system theme', () => {
  const svg = readFileSync(path.join(root, 'site/assets/favicon.svg'), 'utf8');
  assert.equal((svg.match(/<path class="(?:letra|dois)"/g) || []).length, 3, 'R, 2 and S as outlines, no font needed');
  assert.match(svg, /<circle class="ponto" fill="#FF5800"/);
  assert.match(svg, /prefers-color-scheme:dark/);
  assert.doesNotMatch(svg, /<text/);
});

test('the dashboard carries identical copies', () => {
  for (const f of ARQUIVOS) {
    assert.ok(readFileSync(path.join(root, 'admin/dashboard', f)).equals(readFileSync(path.join(root, 'site/assets', f))), f);
  }
});
