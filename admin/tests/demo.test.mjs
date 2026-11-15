import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDemo } from '../scripts/demo.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('startDemo serves the dashboard and its data, and close() stops it', async () => {
  const demo = await startDemo({ port: 0 });
  try {
    assert.match(demo.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    const page = await fetch(demo.url);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Painel R2S Lab/);
    const data = await (await fetch(`${demo.url}data.json`)).json();
    assert.equal(data.squads.length, 1);
    assert.equal(data.scorecard.length, 10);
    assert.equal((await fetch(`${demo.url}nao-existe`)).status, 404);
    assert.equal((await fetch(`${demo.url}..%2f..%2fpackage.json`)).status, 404, 'no path traversal');
  } finally {
    await demo.close();
  }
  await assert.rejects(() => fetch(demo.url));
});

test('package.json has the demo script', () => {
  assert.equal(JSON.parse(read('package.json')).scripts.demo, 'node scripts/demo.mjs');
});

test('the test guide covers every piece and what needs the real GitHub', () => {
  const guide = read('docs/TESTE-DA-PLATAFORMA.md');
  for (const needle of [
    'npm run demo', 'tools/check-squad.mjs', 'LAB_READ_TOKEN', 'npm run serve', '00-prework/index.html',
    '05-encerramento/pesquisa.html', '05-encerramento/certificado.html', '--fixtures', 'visibilidade', 'owner', 'roster.csv',
  ]) {
    assert.ok(guide.includes(needle), `the guide should mention "${needle}"`);
  }
  assert.ok(!guide.includes(['Requirement', 'to', 'Solution'].join('-')));
});

test('the README points to the guide', () => {
  assert.ok(read('README.md').includes('docs/TESTE-DA-PLATAFORMA.md'));
});
