#!/usr/bin/env node
// Gera academy/selos/<curso>.svg: o selo de cada curso como arquivo autônomo, sem nome nem data,
// alinhado no navegador (getBBox) com o mesmo código da Academy (lib/badge-art.js).
// Uso: node tools/build-badges.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'playwright'))); }

export function cursos() {
  const sandbox = { window: {} };
  for (const f of ['js/academy-content.js', 'js/academy-squad.js']) new Function('window', readFileSync(path.join(ROOT, f), 'utf8'))(sandbox.window);
  const pre = sandbox.window.R2S_ACADEMY.parts.map((p) => ({ id: 'p' + p.part, titulo: p.title, seed: p.part }));
  const squad = sandbox.window.R2S_ACADEMY_SQUAD.courses.map((c, i) => ({ id: c.id, titulo: c.titulo, seed: 20 + i }));
  return [...pre, ...squad];
}

export async function gerar(outDir = path.join(ROOT, 'academy', 'selos')) {
  const lib = readFileSync(path.join(ROOT, 'lib', 'badge-art.js'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: lib });
  mkdirSync(outDir, { recursive: true });
  const lista = cursos();
  for (const c of lista) {
    const svg = await page.evaluate((curso) => {
      document.body.textContent = '';
      const node = window.R2SBadgeArt.completo(document, curso, '', '', { semNome: true, id: 'selo-' + curso.id });
      document.body.appendChild(node);
      window.R2SBadgeArt.alinhar(document);
      return window.R2SBadgeArt.serializar(node);
    }, c);
    writeFileSync(path.join(outDir, c.id + '.svg'), svg);
  }
  await browser.close();
  return lista.map((c) => c.id);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const ids = await gerar();
  console.log('selos gerados: ' + ids.join(', '));
}
