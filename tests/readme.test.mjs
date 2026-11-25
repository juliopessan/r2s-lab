import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(
  path.join(root, 'README.md'),
  'utf8',
);

test('has the name and the hook of the landing', () => {
  assert.ok(readme.includes('R2S Lab — Reskilling too Skilling'));
  assert.ok(readme.includes('“Dá pra resolver isso com IA?”'));
  assert.ok(!readme.includes('## R · 2 · S'), 'the acronym section left the landing and the README');
});

test('has the start instructions', () => {
  assert.match(readme, /```bash[\s\S]*?git clone[\s\S]*?```/);
  assert.ok(readme.includes('VS Code'));
});

test('lists the planned structure', () => {
  for (const dir of ['site/', 'academy/', '00-prework/', '05-encerramento/', 'templates/', 'starter-kits/', 'squad/', 'progress/', 'admin/']) {
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
    'Curso não muda papel. Caso real muda.',
    'Como funciona',
    'Comece aqui',
    'R2S Academy',
    'A jornada da squad',
    'Estrutura do repositório',
    'Regras do lab',
    'Para quem mantém o lab',
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
const PLAYER = 'https://github.com/juliopessan/r2s-lab/blob/main/site/assets/teaser.mp4';

test('the hero carries the teaser with sound: a player, a clickable poster and plain links', () => {
  const video = /<video[^>]*>/.exec(readme);
  assert.ok(video, 'missing <video> embed');
  assert.ok(video[0].includes(`src="${MP4}"`));
  assert.match(video[0], /\bcontrols\b/);
  assert.doesNotMatch(video[0], /\bmuted\b/, 'the narration must be heard');
  assert.ok(readme.includes(`<a href="${PLAYER}"><img src="docs/readme/teaser-play.jpg"`), 'poster fallback opens the player with sound');
  assert.ok(existsSync(path.join(root, 'docs/readme/teaser-play.jpg')));
  assert.ok(readme.includes(`[assistir com som](${PLAYER})`));
  assert.ok(readme.includes(`](${MP4})`), 'missing plain link to the mp4');
});

test('the video sits in the hero, before the first section', () => {
  assert.ok(readme.indexOf('<video') > -1);
  assert.ok(readme.indexOf('<video') < readme.indexOf('\n## '));
});

test('explains how to open the pages and how to export', () => {
  for (const needle of [
    '00-prework/index.html', '05-encerramento/pesquisa.html', 'Exportar progresso', 'progress/', 'commit', 'push',
  ]) {
    assert.ok(readme.includes(needle), `README should mention "${needle}"`);
  }
  assert.ok(!readme.includes('chega com a fase 2'));
});

test('documents the squad flow and the certificate', () => {
  for (const needle of [
    'squad/', 'tools/check-squad.mjs', '[preencher]', '05-encerramento/certificado.html', 'gates.json', 'coach',
  ]) {
    assert.ok(readme.includes(needle), `README should mention "${needle}"`);
  }
  assert.ok(!readme.includes('chegam depois'));
});

test('the install guide is a step-by-step with the template link, the clone and the progress commands', () => {
  const guia = readme.slice(readme.indexOf('## Comece aqui'), readme.indexOf('## R2S Academy'));
  const passos = [...guia.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(passos, [
    'O que você precisa',
    '1. Crie o seu repositório privado a partir do template',
    '2. Clone o seu repositório e abra no VS Code',
    '3. Abra a Academy e faça o pre-work',
    '4. Registre o seu progresso',
    '5. No fim da turma',
    'Se algo der errado',
  ]);
  for (const needle of ['https://github.com/juliopessan/r2s-lab', 'Use this template', 'Private', 'git clone', 'git add progress/', 'git commit', 'git push', 'Importar']) {
    assert.ok(guia.includes(needle), `missing ${needle}`);
  }
});
