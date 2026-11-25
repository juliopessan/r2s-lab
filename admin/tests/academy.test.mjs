import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACADEMY_COURSES, aggregateAcademy, badgesOf } from '../src/academy.mjs';
import progress from '../src/vendor/progress.cjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (h) => JSON.parse(readFileSync(path.join(root, 'tests', 'fixtures', 'progress', `${h}.json`), 'utf8'));

test('the course list matches the R2S Academy catalog in the lab', () => {
  const win = {};
  for (const f of ['js/academy-content.js', 'js/academy-squad.js']) new Function('window', readFileSync(path.join(root, '..', f), 'utf8'))(win);
  const lab = [
    ...win.R2S_ACADEMY.parts.map((p) => ['p' + p.part, p.title]),
    ...win.R2S_ACADEMY_SQUAD.courses.map((c) => [c.id, c.titulo]),
  ];
  assert.deepEqual(ACADEMY_COURSES.map((c) => [c.id, c.title]), lab);
});

test('pre-work badges come from the blocks even without the academy section', () => {
  const p = progress.emptyProgress('x1');
  for (const b of progress.PREWORK_BLOCKS.filter((x) => x.part === 2)) p.prework.blocks[b.id] = true;
  assert.deepEqual(Object.keys(badgesOf(p)), ['p2']);
});

test('squad badges come only from the academy section', () => {
  const p = { ...progress.emptyProgress('x1'), academy: { lidas: ['s2.1', 's2.2'], selos: { s2: '2026-11-25' } } };
  assert.deepEqual(badgesOf(p), { s2: '2026-11-25' });
});

test('aggregateAcademy counts people, badges and readers with no names', () => {
  const rows = [{ p: fixture('anasouza') }, { p: fixture('brunolima') }, { p: null }];
  const m = aggregateAcademy(rows);
  assert.equal(m.invited, 3);
  assert.equal(m.squadReaders, 1);
  assert.equal(m.squadLessonsRead, 3);
  assert.equal(m.courses.find((c) => c.id === 's1').badges, 1);
  assert.equal(m.courses.length, 11);
  assert.ok(!JSON.stringify(m).includes('Ana'));
});
