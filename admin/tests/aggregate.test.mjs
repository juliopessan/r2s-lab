import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRoster } from '../src/roster.mjs';
import { aggregate } from '../src/aggregate.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const NOW = new Date('2026-12-03T12:00:00Z');
const roster = parseRoster(readFileSync(path.join(fixtures, 'roster.csv'), 'utf8')).rows;
const FABIO_ERROR = { github: 'fabionunes', message: 'schema deve ser r2s-progress/1.' };

function loadFixtures() {
  const progressByHandle = {};
  for (const f of readdirSync(path.join(fixtures, 'progress'))) {
    const data = JSON.parse(readFileSync(path.join(fixtures, 'progress', f), 'utf8'));
    if (data.schema === 'r2s-progress/1') progressByHandle[data.github.toLowerCase()] = data;
  }
  return progressByHandle;
}

const run = (overrides = {}) =>
  aggregate({
    roster, progressByHandle: loadFixtures(), missing: ['elisarocha'], errors: [FABIO_ERROR], unread: [],
    target: 100, protectedHoursPerWeek: 6, now: NOW, ...overrides,
  });

function assertFinite(value, where = 'root') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${where} is ${value}`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) assertFinite(v, `${where}.${k}`);
}

test('totals for the fixtures', () => {
  const m = run();
  assert.deepEqual(m.totals, { invited: 6, started: 4, preworkDone: 3, surveyDone: 3, missing: 3, unread: 0 });
  assert.equal(m.generatedAt, '2026-12-03T12:00:00.000Z');
  assert.equal(m.target, 100);
});

test('funnel has four stages in order', () => {
  assert.deepEqual(run().funnel, [
    { key: 'invited', label: 'Convidados', count: 6 },
    { key: 'started', label: 'Iniciaram', count: 4 },
    { key: 'preworkDone', label: 'Concluíram o pre-work', count: 3 },
    { key: 'surveyDone', label: 'Responderam a pesquisa', count: 3 },
  ]);
});

test('by wave', () => {
  assert.deepEqual(run().byWave, [
    { onda: 0, invited: 3, started: 3, preworkDone: 3 },
    { onda: 1, invited: 3, started: 1, preworkDone: 0 },
  ]);
});

test('multipliers', () => {
  assert.deepEqual(run().multipliers, { invited: 1, started: 1, preworkDone: 1 });
});

test('nps and categories', () => {
  const s = run().satisfaction;
  assert.equal(s.respondents, 3);
  assert.deepEqual([s.promoters, s.passives, s.detractors], [1, 1, 1]);
  assert.equal(s.nps, 0);
});

test('rating averages, hours and the protected hours', () => {
  const s = run().satisfaction;
  assert.equal(s.ratings.conteudo, 4);
  assert.equal(s.ratings.carga, 3.7);
  assert.equal(Object.keys(s.ratings).length, 8);
  assert.deepEqual(s.hoursPerWeek, { average: 8, protected: 6 });
});

const byText = (feedback, fragment) => feedback.find((f) => f.text.includes(fragment));

test('feedback privacy: names only with consent, quotable by consent', () => {
  const feedback = run().feedback;
  assert.equal(feedback.length, 5);
  const ana = byText(feedback, 'A mentoria com o coach');
  assert.equal(ana.author, 'Ana Souza');
  assert.equal(ana.quotable, true);
  const bruno = byText(feedback, 'exercícios com casos reais');
  assert.equal(bruno.author, null);
  assert.equal(bruno.quotable, true);
  const carla = byText(feedback, 'A carga semanal');
  assert.equal(carla.author, null);
  assert.equal(carla.quotable, false);
  assert.equal(carla.consent, 'nao');
});

test('feedback ids are opaque: no GitHub handle outside the named entries', () => {
  const feedback = run().feedback;
  assert.deepEqual(feedback.map((f) => f.id), ['fb-1', 'fb-2', 'fb-3', 'fb-4', 'fb-5']);
  for (const f of feedback) {
    for (const handle of ['anasouza', 'brunolima', 'carlamendes']) {
      assert.ok(!JSON.stringify(f).toLowerCase().includes(handle), `${f.id} leaks ${handle}`);
    }
  }
});

test('feedback is ordered by question, then text, not by roster order', () => {
  const feedback = run().feedback;
  assert.deepEqual(feedback.map((f) => f.topic), ['melhor', 'melhor', 'mudar', 'mudar', 'aplicou']);
  const melhor = feedback.filter((f) => f.topic === 'melhor').map((f) => f.text);
  assert.deepEqual(melhor, [...melhor].sort((a, b) => a.localeCompare(b, 'pt-BR')));
});

test('feedback carries themes', () => {
  const feedback = run().feedback;
  assert.deepEqual(byText(feedback, 'A carga semanal').themes, ['carga']);
  assert.deepEqual(byText(feedback, 'A mentoria com o coach').themes, ['mentoria']);
});

test('data quality lists missing files, errors and unread people', () => {
  const unread = [{ github: 'diegoalves', reason: 'api', message: 'falha ao ler (status 403)' }];
  const m = run({ unread });
  assert.deepEqual(m.dataQuality, { missingFiles: ['elisarocha'], errors: [FABIO_ERROR], unread });
  assert.equal(m.totals.unread, 1);
});

test('output has no emails and only the consented name', () => {
  const json = JSON.stringify(run());
  assert.ok(!json.includes('@exemplo.com'));
  assert.ok(!json.includes('Bruno Lima'));
  assert.ok(!json.includes('Carla Mendes'));
  assert.ok(json.includes('Ana Souza'));
});

test('empty input is safe', () => {
  const m = aggregate({
    roster: [], progressByHandle: {}, missing: [], errors: [], unread: [], target: 100, protectedHoursPerWeek: 6, now: NOW,
  });
  assert.deepEqual(m.totals, { invited: 0, started: 0, preworkDone: 0, surveyDone: 0, missing: 0, unread: 0 });
  assert.equal(m.satisfaction.nps, null);
  assert.equal(m.satisfaction.hoursPerWeek.average, null);
  assert.ok(Object.values(m.satisfaction.ratings).every((v) => v === null));
  assert.deepEqual(m.byWave, []);
  assert.deepEqual(m.feedback, []);
  assertFinite(m);
  assert.ok(!JSON.stringify(m).includes('NaN'));
});

test('unread is optional and defaults to none', () => {
  const m = aggregate({ roster, progressByHandle: {}, missing: [], errors: [], target: 100, protectedHoursPerWeek: 6, now: NOW });
  assert.equal(m.totals.unread, 0);
  assert.deepEqual(m.dataQuality.unread, []);
});

test('no respondents gives null averages', () => {
  const m = run({ progressByHandle: {}, missing: [], errors: [] });
  assert.equal(m.totals.invited, 6);
  assert.equal(m.totals.started, 0);
  assert.equal(m.satisfaction.respondents, 0);
  assert.equal(m.satisfaction.nps, null);
  assert.equal(m.satisfaction.ratings.conteudo, null);
  assertFinite(m);
});

test('handles match ignoring case', () => {
  const data = loadFixtures();
  const m = run({ progressByHandle: { AnaSouza: data.anasouza } });
  assert.equal(m.totals.started, 1);
  assert.equal(m.totals.preworkDone, 1);
});

test('started means any block, answered quiz or self-assessment', () => {
  const base = { schema: 'r2s-progress/1', github: 'diegoalves', updatedAt: NOW.toISOString(), survey: null };
  const only = (progress) => run({ progressByHandle: { diegoalves: { ...base, ...progress } }, missing: [], errors: [] }).totals.started;
  assert.equal(only({ prework: { blocks: {}, quizzes: {} }, selfAssessment: null }), 0);
  assert.equal(only({ prework: { blocks: { '1.1': true }, quizzes: {} }, selfAssessment: null }), 1);
  assert.equal(only({ prework: { blocks: {}, quizzes: { m1_llm: { answered: 1, correct: 0 } } }, selfAssessment: null }), 1);
  assert.equal(only({ prework: { blocks: {}, quizzes: {} }, selfAssessment: { problemFraming: 2 } }), 1);
});
