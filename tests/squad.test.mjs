import { test } from 'node:test';
import assert from 'node:assert/strict';
import squadLib from '../lib/squad.js';

const {
  SCHEMA_ID, GATES, ROLES, DECISIONS, DOCS, DOC_FILES, PENDING, TEMPLATE_FIELDS,
  emptySquad, validateSquad, countPending, section, optionsFilled, dossierStatus, currentGate, squadChecks,
} = squadLib;

const HANDLES = ['ana', 'bruno', 'carla', 'diego', 'elisa'];
const rolesMap = () => Object.fromEntries(ROLES.map((r, i) => [r, HANDLES[i]]));

function completeSquad() {
  const s = emptySquad();
  Object.assign(s, { squad: 'multiplicadores', case: 'Fechamento do caixa', sponsor: 'Controladoria', coach: 'coach-x' });
  s.members = ROLES.map((role, i) => ({ github: HANDLES[i], role }));
  const pass = (g, by, date, extra = {}) => Object.assign(s.gates[g], { status: 'passed', attempts: 1, approvedBy: by, approvedAt: date }, extra);
  pass('G0', 'Controladoria', '2026-01-10');
  pass('G1', 'Controladoria', '2026-01-24', { annualValue: 360000, annualRunCost: 60000 });
  pass('G2', 'coach-x', '2026-02-07');
  pass('G3', 'coach-x', '2026-03-07', { costPerTransaction: 0.04 });
  pass('G4', 'Controladoria', '2026-03-28', { decision: 'escalar' });
  s.roles = { G1: rolesMap(), G2: rolesMap(), G3: rolesMap() };
  s.assets = ['kit-de-avaliacao'];
  return s;
}

test('the contract constants', () => {
  assert.equal(SCHEMA_ID, 'r2s-squad/1');
  assert.deepEqual(GATES, ['G0', 'G1', 'G2', 'G3', 'G4']);
  assert.deepEqual(ROLES, ['product-lead', 'data-lead', 'ai-engineer', 'eval-risk-lead', 'storyteller']);
  assert.deepEqual(DECISIONS, ['escalar', 'iterar', 'encerrar']);
  assert.deepEqual(DOCS, ['A', 'B', 'C', 'D', 'E']);
  assert.equal(DOC_FILES.B, 'B-adr.md');
  assert.equal(PENDING, '[preencher]');
  assert.deepEqual(TEMPLATE_FIELDS, { A: 14, B: 9, C: 6, D: 9, E: 11 });
});

test('emptySquad validates', () => {
  assert.deepEqual(validateSquad(emptySquad()), { ok: true, errors: [] });
});

test('a complete squad validates', () => {
  assert.deepEqual(validateSquad(completeSquad()), { ok: true, errors: [] });
});

const rejects = (name, mutate, fragment) =>
  test(`validateSquad rejects ${name}`, () => {
    const s = completeSquad();
    mutate(s);
    const result = validateSquad(s);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 1);
    if (fragment) assert.ok(result.errors.join(' ').includes(fragment), result.errors.join(' | '));
  });

rejects('a wrong schema', (s) => { s.schema = 'r2s-squad/0'; });
rejects('an unknown role', (s) => { s.members[0].role = 'chefe'; });
rejects('a repeated role', (s) => { s.members[1].role = 'product-lead'; });
rejects('six members', (s) => { s.members.push({ github: 'fabio', role: 'storyteller' }); });
rejects('a missing gate', (s) => { delete s.gates.G3; });
rejects('a passed gate without approver', (s) => { s.gates.G0.approvedBy = null; });
rejects('a passed gate with an invalid date', (s) => { s.gates.G0.approvedAt = '10/01/2026'; });
rejects('G2 passed while G1 is pending', (s) => { s.gates.G1.status = 'pending'; }, 'antes');
rejects('killed at G3', (s) => { s.gates.G3.status = 'killed'; });
rejects('a gate after a killed one that is not pending', (s) => { s.gates.G1.status = 'killed'; });
rejects('a G1 value of exactly 3x the run cost', (s) => { s.gates.G1.annualValue = 120000; s.gates.G1.annualRunCost = 40000; }, 'maior que 3×');
rejects('G2 approved by someone who is not the coach', (s) => { s.gates.G2.approvedBy = 'outra-pessoa'; });
rejects('G1 without the five roles', (s) => { delete s.roles.G1['storyteller']; });
rejects('G4 without a decision', (s) => { s.gates.G4.decision = null; });
rejects('G4 without assets', (s) => { s.assets = []; });
rejects('G3 without cost per transaction', (s) => { s.gates.G3.costPerTransaction = null; });

test('a G1 value just above 3x passes', () => {
  const s = completeSquad();
  s.gates.G1.annualValue = 120001;
  s.gates.G1.annualRunCost = 40000;
  assert.equal(validateSquad(s).ok, true);
});

test('a killed gate with pending gates after it is valid', () => {
  const s = emptySquad();
  s.gates.G0 = { ...s.gates.G0, status: 'passed', attempts: 1, approvedBy: 'Controladoria', approvedAt: '2026-01-10' };
  s.gates.G1 = { ...s.gates.G1, status: 'killed', attempts: 1, approvedBy: 'Controladoria', approvedAt: '2026-01-24' };
  assert.equal(validateSquad(s).ok, true);
});

test('validateSquad rejects non-objects', () => {
  for (const value of [null, 'x', 3, []]) assert.equal(validateSquad(value).ok, false);
});

test('countPending counts [preencher] and ignores [opcional]', () => {
  assert.equal(countPending(`a ${PENDING} b ${PENDING}\n[opcional]`), 2);
  assert.equal(countPending(''), 0);
});

test('dossierStatus without texts is fully pending', () => {
  const status = dossierStatus({});
  assert.equal(status.percent, 0);
  assert.equal(status.pending, 49);
  assert.equal(status.total, 49);
  assert.deepEqual(status.byDoc.A, { pending: 14, total: 14, percent: 0 });
});

test('dossierStatus computes the percent per document', () => {
  const status = dossierStatus({ A: Array(7).fill(PENDING).join('\n') });
  assert.deepEqual(status.byDoc.A, { pending: 7, total: 14, percent: 50 });
  assert.equal(status.byDoc.B.percent, 0, 'a missing text counts as everything pending');
});

test('dossierStatus caps pending at the total and reaches 100%', () => {
  const status = dossierStatus({ A: Array(20).fill(PENDING).join(' '), B: 'ok', C: 'ok', D: 'ok', E: 'ok' });
  assert.equal(status.byDoc.A.pending, 14);
  assert.equal(status.byDoc.B.percent, 100);
  assert.equal(status.pending, 14);
  assert.equal(status.total, 49);
  assert.equal(status.percent, 71);
  const full = dossierStatus({ A: 'ok', B: 'ok', C: 'ok', D: 'ok', E: 'ok' });
  assert.equal(full.percent, 100);
  assert.equal(full.pending, 0);
});

test('currentGate', () => {
  const s = emptySquad();
  assert.deepEqual(currentGate(s), { gate: 'G0', killed: false, done: false });
  Object.assign(s.gates.G0, { status: 'passed' });
  Object.assign(s.gates.G1, { status: 'passed' });
  assert.deepEqual(currentGate(s), { gate: 'G2', killed: false, done: false });
  assert.deepEqual(currentGate(completeSquad()), { gate: null, killed: false, done: true });
  const k = emptySquad();
  k.gates.G0.status = 'passed';
  k.gates.G1.status = 'killed';
  assert.deepEqual(currentGate(k), { gate: 'G1', killed: true, done: false });
});

const DOCS_OK = () => ({
  A: 'ok', B: '## Opção 1\nCusto alto\n## Opção 2\nCusto baixo\n## Opção 3\n[opcional]\n',
  C: 'ok',
  D: '## Revisão no G2 (design)\nok\n## Revisão no G3 (pré-lançamento)\nok\n## Revisão de 90 dias (pós-lançamento)\nok\n',
  E: 'ok',
});

test('squadChecks accepts a consistent squad', () => {
  assert.deepEqual(squadChecks(completeSquad(), { docs: DOCS_OK(), goldenRows: 60 }), []);
});

test('squadChecks: G0 and G1 need the case brief without pending fields', () => {
  const docs = { ...DOCS_OK(), A: `${PENDING} ${PENDING}` };
  const errors = squadChecks(completeSquad(), { docs, goldenRows: 60 });
  assert.ok(errors.includes('G0 aprovado, mas o case brief (A) ainda tem 2 campos pendentes.'));
  assert.ok(errors.some((e) => e.startsWith('G1 aprovado')));
});

test('squadChecks: G2 needs the ADR complete, two options and the SIS G2 review', () => {
  const pending = squadChecks(completeSquad(), { docs: { ...DOCS_OK(), B: `${PENDING}\n${PENDING}\n${PENDING}` }, goldenRows: 60 });
  assert.ok(pending.includes('G2 aprovado, mas o ADR (B) ainda tem 3 campos pendentes.'));
  const oneOption = squadChecks(completeSquad(), { docs: { ...DOCS_OK(), B: '## Opção 1\nCusto\n## Opção 2\n[opcional]\n' }, goldenRows: 60 });
  assert.ok(oneOption.includes('G2 aprovado, mas o ADR (B) precisa comparar pelo menos 2 opções.'));
  const noSection = squadChecks(completeSquad(), { docs: { ...DOCS_OK(), D: 'sem seções' }, goldenRows: 60 });
  assert.ok(noSection.includes('G2 aprovado, mas a revisão G2 do Social Impact Statement (D) está incompleta.'));
});

test('squadChecks: G3 needs 50 golden cases and the SIS G3 review', () => {
  assert.ok(squadChecks(completeSquad(), { docs: DOCS_OK(), goldenRows: 49 }).includes('G3 aprovado, mas o golden set tem 49 casos (mínimo 50).'));
  assert.deepEqual(squadChecks(completeSquad(), { docs: DOCS_OK(), goldenRows: 50 }), []);
  const d = DOCS_OK().D.replace('(pré-lançamento)\nok', `(pré-lançamento)\n${PENDING}`);
  assert.ok(squadChecks(completeSquad(), { docs: { ...DOCS_OK(), D: d }, goldenRows: 60 }).some((e) => e.startsWith('G3 aprovado, mas a revisão G3')));
});

test('squadChecks: G4 needs the pitch complete', () => {
  const errors = squadChecks(completeSquad(), { docs: { ...DOCS_OK(), C: PENDING }, goldenRows: 60 });
  assert.ok(errors.includes('G4 aprovado, mas o pitch (C) ainda tem 1 campo pendente.'));
});

test('squadChecks ignores gates that are not passed', () => {
  assert.deepEqual(squadChecks(emptySquad(), { docs: {}, goldenRows: 0 }), []);
});

test('optionsFilled counts only filled options', () => {
  assert.equal(optionsFilled(DOCS_OK().B), 2);
  assert.equal(optionsFilled(''), 0);
  assert.equal(optionsFilled(`## Opção 1\n${PENDING}\n`), 0);
});

test('section finds the three reviews', () => {
  const d = DOCS_OK().D;
  assert.match(section(d, 'g2'), /^## Revisão no G2/);
  assert.match(section(d, 'g3'), /pré-lançamento/);
  assert.match(section(d, 'd90'), /90 dias/);
  assert.equal(section('nada', 'g2'), '');
});
