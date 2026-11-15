import { test } from 'node:test';
import assert from 'node:assert/strict';
import progress from '../lib/progress.js';

const {
  SCHEMA_ID, TOTAL_MIN, PREWORK_BLOCKS, QUIZ_IDS, COMPETENCIES, RATINGS,
  emptyProgress, validateProgress, preworkMinutes, mergeProgress, routeForAverage, npsCategory,
} = progress;

const NOW = '2026-12-03T12:00:00.000Z';
const base = () => ({ ...emptyProgress('anasouza'), updatedAt: NOW });
const fullSurvey = () => ({
  nps: 9,
  ratings: Object.fromEntries(RATINGS.map((k) => [k, 4])),
  hoursPerWeek: 6,
  open: { melhor: '', mudar: '', aplicou: '' },
  consent: 'anon',
  submittedAt: NOW,
});

test('TOTAL_MIN is 480 and the parts sum to 150, 105, 90, 75, 60', () => {
  assert.equal(TOTAL_MIN, 480);
  const sums = [1, 2, 3, 4, 5].map((part) =>
    PREWORK_BLOCKS.filter((b) => b.part === part).reduce((a, b) => a + b.min, 0));
  assert.deepEqual(sums, [150, 105, 90, 75, 60]);
});

test('PREWORK_BLOCKS has 13 unique ids', () => {
  assert.equal(PREWORK_BLOCKS.length, 13);
  assert.equal(new Set(PREWORK_BLOCKS.map((b) => b.id)).size, 13);
});

test('the contract lists nine quizzes, eight competencies and eight ratings', () => {
  assert.equal(SCHEMA_ID, 'r2s-progress/1');
  assert.equal(QUIZ_IDS.length, 9);
  assert.equal(COMPETENCIES.length, 8);
  assert.equal(RATINGS.length, 8);
});

test('emptyProgress validates', () => {
  assert.deepEqual(validateProgress(base()), { ok: true, errors: [] });
});

const rejects = (name, mutate) =>
  test(`validateProgress rejects ${name}`, () => {
    const p = base();
    mutate(p);
    const result = validateProgress(p);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 1);
  });

rejects('a wrong schema', (p) => { p.schema = 'r2s-progress/0'; });
rejects('an empty github', (p) => { p.github = ''; });
rejects('an invalid github', (p) => { p.github = '-ab'; });
rejects('an unknown block', (p) => { p.prework.blocks['9.9'] = true; });
rejects('a quiz with more correct than answered', (p) => { p.prework.quizzes.m1_llm = { answered: 1, correct: 2 }; });
rejects('an unknown quiz', (p) => { p.prework.quizzes.nope = { answered: 1, correct: 1 }; });
rejects('a competency above 4', (p) => { p.selfAssessment = { problemFraming: 5 }; });
rejects('an nps of 11', (p) => { p.survey = { ...fullSurvey(), nps: 11 }; });
rejects('a rating of 6', (p) => { p.survey = fullSurvey(); p.survey.ratings.conteudo = 6; });
rejects('a survey missing a rating', (p) => { p.survey = fullSurvey(); delete p.survey.ratings.demo; });
rejects('an unknown consent', (p) => { p.survey = { ...fullSurvey(), consent: 'talvez' }; });
rejects('negative hours', (p) => { p.survey = { ...fullSurvey(), hoursPerWeek: -1 }; });

test('validateProgress accepts a complete survey and self-assessment', () => {
  const p = base();
  p.survey = fullSurvey();
  p.selfAssessment = Object.fromEntries(COMPETENCIES.map((k) => [k, 3]));
  assert.deepEqual(validateProgress(p), { ok: true, errors: [] });
});

test('validateProgress rejects non-objects', () => {
  for (const value of [null, 'x', 3, []]) assert.equal(validateProgress(value).ok, false);
});

test('preworkMinutes sums only the done blocks', () => {
  const p = base();
  p.prework.blocks['1.1'] = true;
  p.prework.blocks['1.2'] = true;
  assert.equal(preworkMinutes(p), 105);
  for (const b of PREWORK_BLOCKS) p.prework.blocks[b.id] = true;
  assert.equal(preworkMinutes(p), TOTAL_MIN);
});

test('mergeProgress keeps the other sections', () => {
  const p = base();
  p.prework.blocks['1.1'] = true;
  const merged = mergeProgress(p, { survey: fullSurvey() });
  assert.equal(merged.prework.blocks['1.1'], true);
  assert.equal(merged.survey.nps, 9);
  assert.equal(p.survey, null, 'the base is not mutated');
});

test('routeForAverage boundaries', () => {
  assert.equal(routeForAverage(1.5), 'lab-zero');
  assert.equal(routeForAverage(1.6), 'cohort');
  assert.equal(routeForAverage(2.5), 'cohort');
  assert.equal(routeForAverage(2.6), 'lead');
});

test('npsCategory boundaries', () => {
  assert.equal(npsCategory(6), 'detractor');
  assert.equal(npsCategory(7), 'passive');
  assert.equal(npsCategory(8), 'passive');
  assert.equal(npsCategory(9), 'promoter');
});

const { surveyFromDraft } = progress;
const NOW_DATE = new Date('2026-12-03T12:00:00Z');
const completeDraft = () => ({
  nps: 9,
  ratings: Object.fromEntries(RATINGS.map((k) => [k, 4])),
  hoursPerWeek: '6',
  open: { melhor: 'A mentoria.' },
  consent: 'anon',
});

test('surveyFromDraft lists everything missing, in order', () => {
  assert.deepEqual(surveyFromDraft({}, NOW_DATE), {
    ok: false,
    missing: ['nps', ...RATINGS, 'hoursPerWeek', 'consent'],
  });
});

test('surveyFromDraft does not assume a consent', () => {
  const draft = completeDraft();
  delete draft.consent;
  assert.deepEqual(surveyFromDraft(draft, NOW_DATE), { ok: false, missing: ['consent'] });
  draft.consent = 'talvez';
  assert.deepEqual(surveyFromDraft(draft, NOW_DATE), { ok: false, missing: ['consent'] });
});

test('surveyFromDraft rejects empty and negative hours', () => {
  for (const hours of ['', '-1', 'abc', null]) {
    const draft = { ...completeDraft(), hoursPerWeek: hours };
    assert.deepEqual(surveyFromDraft(draft, NOW_DATE), { ok: false, missing: ['hoursPerWeek'] });
  }
});

test('surveyFromDraft builds a valid survey', () => {
  const result = surveyFromDraft(completeDraft(), NOW_DATE);
  assert.equal(result.ok, true);
  assert.deepEqual(result.survey.open, { melhor: 'A mentoria.', mudar: '', aplicou: '' });
  assert.equal(result.survey.hoursPerWeek, 6);
  assert.equal(result.survey.submittedAt, '2026-12-03T12:00:00.000Z');
  const p = { ...emptyProgress('anasouza'), updatedAt: NOW, survey: result.survey };
  assert.deepEqual(validateProgress(p), { ok: true, errors: [] });
});
