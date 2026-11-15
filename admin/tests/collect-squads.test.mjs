import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRoster } from '../src/roster.mjs';
import { collectProgress, collectSquads, localFetchFile, squadSlug } from '../src/collect.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const roster = parseRoster(readFileSync(path.join(fixtures, 'roster.csv'), 'utf8')).rows;
const person = (squad, github = 'x1') => ({ nome: 'X', email: 'x@exemplo.com', github, onda: 0, squad, papelAtual: 'Data Engineer', trilha: null, multiplicador: false });
const squadFile = (name) => readFileSync(path.join(fixtures, 'squads', 'multiplicadores', 'squad', name), 'utf8');

const fake = (respond) => {
  const calls = [];
  return { calls, fetchFile: async (owner, repo, p) => { calls.push({ owner, repo, path: p }); return respond(owner, repo, p); } };
};
const ok = (text) => ({ status: 200, text });
const GATES = () => squadFile('gates.json');

test('squadSlug lowercases, drops accents and collapses symbols', () => {
  assert.equal(squadSlug('Multiplicadores'), 'multiplicadores');
  assert.equal(squadSlug('Squad Dados & IA'), 'squad-dados-ia');
  assert.equal(squadSlug('  Análise de Crédito!! '), 'analise-de-credito');
});

test('reads one repository per distinct squad name and ignores people without a squad', async () => {
  const { fetchFile, calls } = fake(() => ({ status: 404 }));
  await collectSquads([person('Alfa', 'a1'), person('Alfa', 'a2'), person('Beta', 'b1'), person(null, 'c1')], { owner: 'org-x', fetchFile });
  assert.deepEqual([...new Set(calls.map((c) => c.repo))].sort(), ['r2s-lab-squad-alfa', 'r2s-lab-squad-beta']);
  assert.ok(calls.some((c) => c.owner === 'org-x' && c.path === 'squad/gates.json'));
});

test('the fixture squad is read through localFetchFile: gates, assessment and five documents', async () => {
  const result = await collectSquads(roster, { owner: 'o', fetchFile: localFetchFile(fixtures) });
  assert.deepEqual(Object.keys(result.byName), ['multiplicadores']);
  const found = result.byName.multiplicadores;
  assert.equal(found.gates.squad, 'multiplicadores');
  assert.equal(found.assessment.sandbox.spentUsd, 120);
  assert.deepEqual(Object.keys(found.docs).sort(), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual([result.missing, result.errors, result.unread], [[], [], []]);
});

test('a missing assessment.json is null, not an error', async () => {
  const { fetchFile } = fake((_o, _r, p) => (p === 'squad/gates.json' ? ok(GATES()) : { status: 404 }));
  const result = await collectSquads([person('multiplicadores')], { owner: 'o', fetchFile });
  assert.equal(result.byName.multiplicadores.assessment, null);
  assert.deepEqual(result.errors, []);
});

test('a missing document is left out of docs', async () => {
  const { fetchFile } = fake((_o, _r, p) => (p === 'squad/gates.json' ? ok(GATES()) : p === 'squad/A-case-brief.md' ? ok('texto') : { status: 404 }));
  const result = await collectSquads([person('multiplicadores')], { owner: 'o', fetchFile });
  assert.deepEqual(Object.keys(result.byName.multiplicadores.docs), ['A']);
});

test('gates.json 404 without a probe is missing', async () => {
  const { fetchFile } = fake(() => ({ status: 404 }));
  const result = await collectSquads([person('Alfa')], { owner: 'o', fetchFile });
  assert.deepEqual(result.missing, ['Alfa']);
  assert.deepEqual(result.byName, {});
});

test('gates.json 404 with a probe: 200 is missing, 404 is an unread repo', async () => {
  const { fetchFile } = fake(() => ({ status: 404 }));
  const exists = await collectSquads([person('Alfa')], { owner: 'o', fetchFile, probeRepo: async () => ({ status: 200 }) });
  assert.deepEqual(exists.missing, ['Alfa']);
  const hidden = await collectSquads([person('Alfa')], { owner: 'o', fetchFile, probeRepo: async () => ({ status: 404 }) });
  assert.deepEqual(hidden.missing, []);
  assert.equal(hidden.unread[0].reason, 'repo');
  assert.equal(hidden.unread[0].squad, 'Alfa');
});

test('a 500 is an unread api failure', async () => {
  const { fetchFile } = fake(() => ({ status: 500 }));
  const result = await collectSquads([person('Alfa')], { owner: 'o', fetchFile });
  assert.equal(result.unread[0].reason, 'api');
  assert.deepEqual(result.missing, []);
});

test('a 500 on a document also leaves the squad unread instead of half-read', async () => {
  const { fetchFile } = fake((_o, _r, p) => (p === 'squad/gates.json' ? ok(GATES()) : p === 'squad/B-adr.md' ? { status: 500 } : { status: 404 }));
  const result = await collectSquads([person('multiplicadores')], { owner: 'o', fetchFile });
  assert.deepEqual(result.byName, {});
  assert.equal(result.unread[0].reason, 'api');
});

test('an invalid gates.json is an error', async () => {
  for (const bad of ['{nope', JSON.stringify({ schema: 'x' })]) {
    const { fetchFile } = fake((_o, _r, p) => (p === 'squad/gates.json' ? ok(bad) : { status: 404 }));
    const result = await collectSquads([person('Alfa')], { owner: 'o', fetchFile });
    assert.equal(result.errors.length, 1, bad);
    assert.equal(result.errors[0].squad, 'Alfa');
    assert.deepEqual(result.byName, {});
  }
});

test('an invalid assessment is an error and the squad keeps its gates', async () => {
  const bad = JSON.parse(squadFile('assessment.json'));
  bad.squadRubric.framing = 9;
  const { fetchFile } = fake((_o, _r, p) => (p === 'squad/gates.json' ? ok(GATES()) : p === 'squad/assessment.json' ? ok(JSON.stringify(bad)) : { status: 404 }));
  const result = await collectSquads([person('multiplicadores')], { owner: 'o', fetchFile });
  assert.equal(result.errors.length, 1);
  assert.equal(result.byName.multiplicadores.assessment, null);
});

test('an exception never leaks its message', async () => {
  const secret = 'ghp_SEGREDO';
  const result = await collectSquads([person('Alfa')], { owner: 'o', fetchFile: async () => { throw new Error(`token ${secret}`); } });
  assert.equal(result.unread.length, 1);
  assert.ok(!JSON.stringify(result).includes(secret));
});

test('localFetchFile still reads progress/<handle>.json', async () => {
  const result = await collectProgress(roster, { owner: 'x', fetchFile: localFetchFile(fixtures) });
  assert.deepEqual(Object.keys(result.byHandle).sort(), ['anasouza', 'brunolima', 'carlamendes', 'diegoalves']);
});
