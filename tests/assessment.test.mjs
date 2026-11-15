import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assessment from '../lib/assessment.js';
import progress from '../lib/progress.js';

const {
  SCHEMA_ID, RUBRIC, emptyAssessment, emptyMember, validateAssessment, squadScore, individualScore, finalScore,
  levelFor, competencyGain,
} = assessment;
const { COMPETENCIES } = progress;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const close = (a, b, msg) => assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${msg || ''} ${a} !== ${b}`);

const rubric = (values) => Object.fromEntries(RUBRIC.map((d, i) => [d.key, values[i]]));
const ALL3 = rubric([3, 3, 3, 3, 3, 3]);
const comps = (n) => Object.fromEntries(COMPETENCIES.map((k) => [k, n]));

test('the contract constants', () => {
  assert.equal(SCHEMA_ID, 'r2s-assessment/1');
  assert.deepEqual(RUBRIC.map((d) => [d.key, d.weight]), [
    ['framing', 25], ['design', 20], ['engineering', 20], ['evaluation', 15], ['cost', 10], ['communication', 10],
  ]);
  assert.equal(RUBRIC.reduce((a, d) => a + d.weight, 0), 100);
});

test('the empty assessment validates', () => {
  assert.deepEqual(validateAssessment(emptyAssessment()), { ok: true, errors: [] });
  assert.deepEqual(validateAssessment({ ...emptyAssessment(), members: { anasouza: emptyMember() } }), { ok: true, errors: [] });
});

test('squadScore is the weighted average', () => {
  close(squadScore(ALL3), 3);
  close(squadScore(rubric([4, 3, 3, 2, 4, 3])), 3.2);
  close(squadScore(rubric([3, 3, 3, 2, 3, 3])), 2.85);
});

test('squadScore is null when a dimension is missing', () => {
  assert.equal(squadScore(rubric([3, 3, 3, 3, 3, null])), null);
  assert.equal(squadScore(emptyAssessment().squadRubric), null);
});

test('individualScore weights coach 50%, peers 25% and the knowledge check 25%', () => {
  close(individualScore({ coachObservation: 4, peerReview: 3, knowledgeCheckPct: 80 }), 3.6);
  close(individualScore({ coachObservation: 2, peerReview: 4, knowledgeCheckPct: 100 }), 3);
  assert.equal(individualScore({ coachObservation: 4, peerReview: null, knowledgeCheckPct: 80 }), null);
  assert.equal(individualScore({ coachObservation: 4, peerReview: 3, knowledgeCheckPct: null }), null);
});

test('finalScore is 60% squad and 40% individual', () => {
  close(finalScore(3.2, 3.6), 3.36);
  assert.equal(finalScore(null, 3.6), null);
  assert.equal(finalScore(3.2, null), null);
});

const member = (extra = {}) => ({ ...emptyMember(), ...extra });

test('Foundation needs Lab Zero and a knowledge check of at least 70%', () => {
  assert.equal(levelFor(member({ labZeroCompleted: true, knowledgeCheckPct: 70 }), ALL3), 'foundation');
  assert.equal(levelFor(member({ labZeroCompleted: true, knowledgeCheckPct: 69 }), ALL3), 'none');
  assert.equal(levelFor(member({ labZeroCompleted: false, knowledgeCheckPct: 95 }), ALL3), 'none');
});

test('Practitioner needs a final score of at least 3.0, exactly on the boundary included', () => {
  const atLimit = member({ coachObservation: 2, peerReview: 4, knowledgeCheckPct: 100 });
  close(finalScore(squadScore(ALL3), individualScore(atLimit)), 3);
  assert.equal(levelFor(atLimit, ALL3), 'practitioner');
  const below = member({ coachObservation: 2, peerReview: 4, knowledgeCheckPct: 99 });
  assert.ok(finalScore(squadScore(ALL3), individualScore(below)) < 3);
  assert.equal(levelFor(below, ALL3), 'none');
});

test('a squad dimension below 2 blocks Practitioner whatever the score', () => {
  const lowDim = rubric([4, 4, 4, 4, 4, 1]);
  const star = member({ labZeroCompleted: true, coachObservation: 4, peerReview: 4, knowledgeCheckPct: 100 });
  assert.equal(levelFor(star, lowDim), 'foundation');
  assert.equal(levelFor({ ...star, labZeroCompleted: false }, lowDim), 'none');
});

test('Practitioner does not need Lab Zero', () => {
  const m = member({ labZeroCompleted: false, coachObservation: 4, peerReview: 4, knowledgeCheckPct: 100 });
  assert.equal(levelFor(m, ALL3), 'practitioner');
});

test('Lead needs Practitioner plus both markers', () => {
  const base = member({ coachObservation: 4, peerReview: 4, knowledgeCheckPct: 100 });
  assert.equal(levelFor({ ...base, coachedNextCohort: true, assetReused: true }, ALL3), 'lead');
  assert.equal(levelFor({ ...base, coachedNextCohort: true }, ALL3), 'practitioner');
  assert.equal(levelFor({ ...base, assetReused: true }, ALL3), 'practitioner');
  assert.equal(levelFor(member({ coachedNextCohort: true, assetReused: true }), ALL3), 'none', 'markers alone are not enough');
});

test('competencyGain is the average growth, null when incomplete', () => {
  assert.equal(competencyGain(member({ competencies: { diagnostic: comps(2), final: comps(3) } })), 1);
  assert.equal(competencyGain(member({ competencies: { diagnostic: comps(2), final: null } })), null);
  assert.equal(competencyGain(member({ competencies: { diagnostic: { problemFraming: 2 }, final: comps(3) } })), null);
});

const rejects = (name, mutate) =>
  test(`validateAssessment rejects ${name}`, () => {
    const a = { ...emptyAssessment(), members: { anasouza: emptyMember() } };
    mutate(a);
    assert.equal(validateAssessment(a).ok, false);
  });

rejects('a wrong schema', (a) => { a.schema = 'x'; });
rejects('a rubric score of 5', (a) => { a.squadRubric.framing = 5; });
rejects('an unknown rubric dimension', (a) => { a.squadRubric.beleza = 3; });
rejects('a percentage of 120', (a) => { a.members.anasouza.knowledgeCheckPct = 120; });
rejects('a coach observation of 0', (a) => { a.members.anasouza.coachObservation = 0; });
rejects('a competency of 5', (a) => { a.members.anasouza.competencies.final = comps(5); });
rejects('a competency set with a missing key', (a) => { a.members.anasouza.competencies.diagnostic = { problemFraming: 2 }; });
rejects('negative sandbox spend', (a) => { a.sandbox.spentUsd = -1; });
rejects('an invalid member handle', (a) => { a.members['-x'] = emptyMember(); });
rejects('an unknown member field', (a) => { a.members.anasouza.apelido = 'x'; });
rejects('a non-boolean marker', (a) => { a.members.anasouza.assetReused = 'sim'; });

test('the template squad/assessment.json is the empty assessment', () => {
  assert.deepEqual(JSON.parse(readFileSync(path.join(root, 'squad', 'assessment.json'), 'utf8')), emptyAssessment());
});

/* ---------- integração com o verificador ---------- */

function squadDirWith(assessmentObj) {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), 'r2s-assess-')), 'squad');
  cpSync(path.join(root, 'squad'), dir, { recursive: true });
  if (assessmentObj !== undefined) writeFileSync(path.join(dir, 'assessment.json'), typeof assessmentObj === 'string' ? assessmentObj : JSON.stringify(assessmentObj));
  return dir;
}
const check = (dir) => spawnSync('node', [path.join(root, 'tools', 'check-squad.mjs'), dir], { cwd: root, encoding: 'utf8' });

test('check-squad prints the squad score and each member level', () => {
  const a = emptyAssessment();
  a.squadRubric = rubric([3, 3, 3, 2, 3, 3]);
  a.members.anasouza = member({
    labZeroCompleted: true, knowledgeCheckPct: 90, coachObservation: 4, peerReview: 4, attendancePct: 95,
  });
  a.members.carlamendes = member({ labZeroCompleted: true, knowledgeCheckPct: 60 });
  const res = check(squadDirWith(a));
  assert.equal(res.status, 0, res.stdout);
  assert.match(res.stdout, /Nota da squad: 2\.85/);
  assert.match(res.stdout, /- anasouza: nível practitioner \(nota final 3\.28\)/);
  assert.match(res.stdout, /- carlamendes: nível none \(sem nota final\)/);
});

test('check-squad rejects an invalid assessment', () => {
  const a = emptyAssessment();
  a.squadRubric.framing = 5;
  const res = check(squadDirWith(a));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /erro: /);
});

test('check-squad rejects an assessment that is not JSON', () => {
  const res = check(squadDirWith('{nope'));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /assessment\.json não é um JSON válido/);
});

test('check-squad is silent about an empty assessment', () => {
  const res = check(squadDirWith(emptyAssessment()));
  assert.equal(res.status, 0, res.stdout);
  assert.ok(!res.stdout.includes('Nota da squad'));
});
