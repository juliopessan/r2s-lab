import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GITHUB_ORG } from '../js/config.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tracked = () =>
  execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);

const PUBLIC = /^(index\.html|css\/.+|js\/.+|assets\/.+\.(txt|vtt|svg))$/;
const publicFiles = () => tracked().filter((f) => PUBLIC.test(f));

test('no roster or csv is tracked', () => {
  const offenders = tracked().filter((f) => /\.csv$/i.test(f) || /roster/i.test(f));
  assert.deepEqual(offenders, []);
});

test('no forbidden wording in public files', () => {
  const files = publicFiles();
  assert.ok(files.length >= 5, `only ${files.length} public files found`);
  for (const file of files) {
    const text = readFileSync(path.join(root, file), 'utf8');
    assert.ok(!text.includes('Requirement-to-Solution'), `${file} uses the open-question wording`);
  }
});

test('no shell command named r2s', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /^\s*\$?\s*r2s\s/m);
});

test('no invented org', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(!html.includes('github.com'), 'the clone address is only built at runtime from the configured org');
  assert.match(GITHUB_ORG, /^$|^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/);
});
