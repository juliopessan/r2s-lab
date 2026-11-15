import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const readme = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'README.md'),
  'utf8',
);

test('has the R·2·S narrative', () => {
  assert.ok(readme.includes('R de **Reskilling**'));
  assert.ok(readme.includes('2 de **too**'));
  assert.ok(readme.includes('S de **Skilling**'));
  assert.ok(readme.includes('R2S Lab — Reskilling too Skilling'));
});

test('has the start instructions', () => {
  assert.match(readme, /```bash[\s\S]*?git clone[\s\S]*?```/);
  assert.ok(readme.includes('VS Code'));
});

test('lists the planned structure', () => {
  for (const dir of ['00-prework/', '05-encerramento/', 'templates/', 'starter-kits/', 'squad/', 'progress/']) {
    assert.ok(readme.includes(dir), `missing ${dir}`);
  }
});

test('has no command named r2s', () => {
  assert.doesNotMatch(readme, /^\s*\$?\s*r2s\s/m);
});

test('avoids the open-question wording', () => {
  assert.ok(!readme.includes('Requirement-to-Solution'));
});

test('keeps the teaser line', () => {
  assert.ok(readme.includes('Menos curso. Mais lab.'));
});

test('has the required sections in order', () => {
  const headings = [...readme.matchAll(/^#{1,2} (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, [
    'R2S Lab',
    'Veja o método em 90 segundos',
    'R · 2 · S',
    'Comece aqui',
    'Estrutura do repositório',
    'Regras do lab',
  ]);
});

test('sends people to their own private repo, not to the shared template', () => {
  assert.ok(readme.includes('Use this template'));
  assert.ok(readme.includes('r2s-lab-<seu-usuario>'));
  assert.ok(readme.includes('privado'));
  assert.ok(!readme.includes('Clone este repositório'));
});

const MP4 =
  'https://raw.githubusercontent.com/juliopessan/r2s-lab/main/docs/source-assets/R2S_Lab_teaser_90s_narrado_16x9.mp4';

test('embeds the teaser video with a plain link fallback', () => {
  assert.ok(readme.includes(`<video src="${MP4}"`), 'missing <video> embed');
  assert.match(readme, /<video[^>]*\bcontrols\b[^>]*>/);
  assert.ok(readme.includes(`](${MP4})`), 'missing plain link to the mp4');
});

test('the video is shown before the R·2·S section', () => {
  assert.ok(readme.indexOf('<video') > -1);
  assert.ok(readme.indexOf('<video') < readme.indexOf('## R · 2 · S'));
});
