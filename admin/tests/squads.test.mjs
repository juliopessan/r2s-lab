import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRoster } from '../src/roster.mjs';
import { collectSquads, localFetchFile } from '../src/collect.mjs';
import { aggregateSquads } from '../src/squads.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const roster = parseRoster(readFileSync(path.join(fixtures, 'roster.csv'), 'utf8')).rows;
const NOW = new Date('2026-11-15T12:00:00Z');
const base = await collectSquads(roster, { owner: 'o', fetchFile: localFetchFile(fixtures) });
const fresh = () => structuredClone(base.byName);
const run = (squads, extra = {}) => aggregateSquads({ roster, squads, now: NOW, target: 100, ...extra });
const close = (a, b) => assert.ok(a !== null && Math.abs(a - b) < 0.005, `${a} !== ${b}`);
const item = (out, key) => out.scorecard.find((i) => i.key === key);

function nonFinite(value, trail = '$') {
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [trail];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => nonFinite(v, `${trail}.${k}`));
  return [];
}

test('the squad row summarises gates, dossier, score and members', () => {
  const [row] = run(fresh()).squads;
  assert.equal(row.squad, 'multiplicadores');
  assert.equal(row.case, 'Fechamento do caixa');
  assert.ok(!('sponsor' in row), 'the sponsor is free text and may be a person: it stays out of the output');
  assert.equal(row.members, 3);
  assert.equal(row.currentGate, 'G3');
  assert.equal(row.killed, false);
  assert.equal(row.done, false);
  assert.equal(row.gatesPassed, 3);
  assert.deepEqual(row.firstAttempt, { passed: 3, firstTry: 2 });
  assert.deepEqual(row.dossier.byDoc, { A: 100, B: 100, C: 50, D: 33, E: 100 });
  assert.equal(row.dossier.percent, 82);
  close(row.squadScore, 2.85);
  assert.equal(row.decision, null);
  assert.equal(row.assets, 1);
  assert.equal(row.review90.status, 'not_due');
  assert.equal(row.review90.due, null);
});

function withG4(squads, approvedAt, completeD) {
  const s = squads.multiplicadores;
  Object.assign(s.gates.gates.G3, { status: 'passed', approvedBy: 'coach-exemplo', approvedAt: '2026-11-20' });
  Object.assign(s.gates.gates.G4, { status: 'passed', attempts: 1, approvedBy: 'Controladoria', approvedAt, decision: 'escalar' });
  if (completeD) s.docs.D = s.docs.D.replaceAll('[preencher]', 'ok');
  return squads;
}

test('the 90-day review is due 90 days after G4 and turns overdue the day after', () => {
  const pendingNow = run(withG4(fresh(), '2026-12-01', false), { now: new Date('2027-03-01T10:00:00Z') }).squads[0];
  assert.equal(pendingNow.review90.due, '2027-03-01');
  assert.equal(pendingNow.review90.status, 'pending');
  const overdue = run(withG4(fresh(), '2026-12-01', false), { now: new Date('2027-03-02T10:00:00Z') }).squads[0];
  assert.equal(overdue.review90.status, 'overdue');
  const done = run(withG4(fresh(), '2026-12-01', true), { now: new Date('2027-03-02T10:00:00Z') }).squads[0];
  assert.equal(done.review90.status, 'done');
  assert.equal(done.decision, 'escalar');
  assert.equal(done.done, true);
});

test('certification counts the levels of the rostered members, without names or e-mails', () => {
  const { certification } = run(fresh());
  assert.deepEqual(certification.byLevel, { none: 1, foundation: 1, practitioner: 1, lead: 0 });
  assert.equal(certification.trained, 2);
  assert.equal(certification.target, 100);
  const byGithub = Object.fromEntries(certification.people.map((p) => [p.github, p]));
  assert.equal(byGithub.anasouza.level, 'practitioner');
  close(byGithub.anasouza.finalScore, 3.28);
  close(byGithub.brunolima.finalScore, 2.92);
  close(byGithub.carlamendes.finalScore, 2.69);
  assert.equal(byGithub.anasouza.squad, 'multiplicadores');
  const text = JSON.stringify(run(fresh()));
  assert.ok(!text.includes('@'), 'no e-mail');
  assert.ok(!/Ana Souza|Bruno Lima|Carla Mendes/.test(text), 'no names');
});

test('an assessed member who is not in the roster is ignored', () => {
  const squads = fresh();
  squads.multiplicadores.assessment.members.intruso = { ...squads.multiplicadores.assessment.members.anasouza };
  const { certification } = run(squads);
  assert.ok(!certification.people.some((p) => p.github === 'intruso'));
  assert.equal(certification.people.length, 3);
});

test('the scorecard has the ten planned items in order with the planned values', () => {
  const out = run(fresh());
  assert.deepEqual(out.scorecard.map((i) => i.key), [
    'attendance', 'gatesFirstAttempt', 'sandbox', 'competencyGain', 'practitionerRate',
    'sponsorDecision', 'valueSigned', 'assets', 'mobility', 'delivery',
  ]);
  const expected = {
    attendance: [88.3, 'met'], gatesFirstAttempt: [66.7, 'not_met'], sandbox: [40, 'met'], competencyGain: [1, 'met'],
    practitionerRate: [33.3, 'not_met'], sponsorDecision: [null, 'not_measured'], valueSigned: [360000, 'tracked'],
    assets: [null, 'not_measured'], mobility: [null, 'not_measured'], delivery: [null, 'not_measured'],
  };
  for (const [key, [value, status]] of Object.entries(expected)) {
    assert.equal(item(out, key).value, value, key);
    assert.equal(item(out, key).status, status, key);
  }
  assert.equal(item(out, 'valueSigned').unit, 'BRL');
  assert.equal(item(out, 'competencyGain').unit, 'níveis');
  for (const i of out.scorecard) {
    assert.ok(['leading', 'learning', 'business', 'mobility', 'delivery'].includes(i.group), i.key);
    assert.ok(i.label && i.target, i.key);
  }
});

test('sponsor decisions and assets are measured once G4 is approved', () => {
  const out = run(withG4(fresh(), '2026-12-01', true));
  assert.equal(item(out, 'sponsorDecision').value, 100);
  assert.equal(item(out, 'sponsorDecision').status, 'met');
  assert.equal(item(out, 'assets').value, 1);
  assert.equal(item(out, 'assets').status, 'met');
});

test('without squads everything is empty and not measured, with no NaN anywhere', () => {
  const out = run({});
  assert.deepEqual(out.squads, []);
  assert.deepEqual(out.certification.byLevel, { none: 0, foundation: 0, practitioner: 0, lead: 0 });
  assert.equal(out.certification.trained, 0);
  assert.deepEqual(out.certification.people, []);
  assert.equal(out.scorecard.length, 10);
  assert.ok(out.scorecard.every((i) => i.value === null && i.status === 'not_measured'));
  assert.deepEqual(nonFinite(out), []);
  assert.deepEqual(nonFinite(run(fresh())), []);
});

test('without assessment.json the score is null and nobody is certified', () => {
  const squads = fresh();
  squads.multiplicadores.assessment = null;
  const out = run(squads);
  assert.equal(out.squads[0].squadScore, null);
  assert.equal(out.certification.people.length, 0);
  assert.equal(out.certification.trained, 0);
  assert.deepEqual(nonFinite(out), []);
});

test('a free-text sponsor name never reaches the output', () => {
  const squads = fresh();
  squads.multiplicadores.gates.sponsor = 'Maria Silva';
  assert.ok(!JSON.stringify(run(squads)).includes('Maria Silva'));
});

test('only people listed as members of the squad are certified', () => {
  const squads = fresh();
  squads.multiplicadores.gates.members = [{ github: 'anasouza', role: 'product-lead' }];
  const out = run(squads);
  assert.deepEqual(out.certification.people.map((p) => p.github), ['anasouza']);
  assert.equal(out.certification.trained, 1);
});

test('a person assessed in two squads is counted once and the conflict is reported', () => {
  const squads = fresh();
  squads['Outra squad'] = structuredClone(squads.multiplicadores);
  const out = run(squads);
  assert.equal(out.certification.people.length, 3);
  assert.equal(out.certification.trained, 2);
  assert.equal(out.issues.length, 3);
  assert.ok(out.issues.every((i) => i.squad === 'Outra squad' && /mais de uma squad/.test(i.message)));
});
