import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import squadLib from '../src/vendor/squad.cjs';
import assessmentLib from '../src/vendor/assessment.cjs';

const { SCHEMA_ID, DOCS, DOC_FILES, validateSquad, squadChecks, dossierStatus } = squadLib;
const { validateAssessment, squadScore, individualScore, finalScore, levelFor } = assessmentLib;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'tests', 'fixtures', 'squads', 'multiplicadores', 'squad');
const gates = JSON.parse(readFileSync(path.join(dir, 'gates.json'), 'utf8'));
const assessment = JSON.parse(readFileSync(path.join(dir, 'assessment.json'), 'utf8'));
const docs = Object.fromEntries(DOCS.map((k) => [k, readFileSync(path.join(dir, DOC_FILES[k]), 'utf8')]));
const goldenRows = readFileSync(path.join(dir, 'golden-set.csv'), 'utf8').split('\n').filter((l) => l.trim()).length - 1;
const close = (a, b) => assert.ok(a !== null && Math.abs(a - b) < 0.005, `${a} !== ${b}`);

test('the vendored contracts are the expected versions', () => {
  assert.equal(SCHEMA_ID, 'r2s-squad/1');
  assert.equal(assessmentLib.SCHEMA_ID, 'r2s-assessment/1');
});

test('the vendored contracts match r2s-lab/lib when run inside the r2s-lab repository', (t) => {
  const lab = path.join(root, '..', 'lib');
  if (!existsSync(lab)) return t.skip('r2s-lab não está ao lado deste repositório');
  for (const name of ['progress', 'squad', 'assessment']) {
    const vendored = readFileSync(path.join(root, 'src', 'vendor', `${name}.cjs`), 'utf8').split('\n').slice(1).join('\n');
    const original = readFileSync(path.join(lab, `${name}.js`), 'utf8').replace("require('./progress.js')", "require('./progress.cjs')");
    assert.equal(vendored, original, `${name}.cjs diverge de r2s-lab/lib/${name}.js`);
  }
});

test('the copied contracts carry the do-not-edit header', () => {
  for (const name of ['squad', 'assessment']) {
    assert.match(readFileSync(path.join(root, 'src', 'vendor', `${name}.cjs`), 'utf8').split('\n')[0], /^\/\/ Copiado de r2s-lab\/lib\/.+Não edite aqui\.$/);
  }
});

test('the fixture squad and assessment are valid', () => {
  assert.deepEqual(validateSquad(gates), { ok: true, errors: [] });
  assert.deepEqual(validateAssessment(assessment), { ok: true, errors: [] });
  assert.deepEqual(squadChecks(gates, { docs, goldenRows }), []);
});

test('the fixture dossier is 82% filled: A, B, E complete, C half, D a third', () => {
  const status = dossierStatus(docs);
  assert.deepEqual(DOCS.map((k) => status.byDoc[k].percent), [100, 100, 50, 33, 100]);
  assert.equal(status.pending, 9);
  assert.equal(status.total, 49);
  assert.equal(goldenRows, 60);
});

test('the fixture gates are G0-G2 passed and G3 in review', () => {
  assert.deepEqual(Object.values(gates.gates).map((g) => g.status), ['passed', 'passed', 'passed', 'in_review', 'pending']);
  assert.deepEqual(Object.values(gates.gates).map((g) => g.attempts), [1, 2, 1, 1, 0]);
});

test('the fixture scores and levels are the planned ones', () => {
  const score = squadScore(assessment.squadRubric);
  close(score, 2.85);
  const expected = { anasouza: ['practitioner', 3.28], brunolima: ['foundation', 2.92], carlamendes: ['none', 2.69] };
  for (const [handle, [level, final]] of Object.entries(expected)) {
    const m = assessment.members[handle];
    assert.equal(levelFor(m, assessment.squadRubric), level, handle);
    close(finalScore(score, individualScore(m)), final);
  }
});
