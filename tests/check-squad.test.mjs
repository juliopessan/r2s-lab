import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import squadLib from '../lib/squad.js';

const { DOCS, DOC_FILES, ROLES, emptySquad } = squadLib;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'tools', 'check-squad.mjs');

const run = (dir) => spawnSync('node', [cli, dir], { cwd: root, encoding: 'utf8' });

/** Cópia do modelo em uma pasta temporária, com as alterações pedidas. */
function squadDir({ fill = false, gates = null, goldenRows = 0, keep = [] } = {}) {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), 'r2s-squad-')), 'squad');
  cpSync(path.join(root, 'squad'), dir, { recursive: true });
  if (fill) {
    for (const key of DOCS) {
      if (keep.includes(key)) continue;
      const file = path.join(dir, DOC_FILES[key]);
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('[preencher]', 'ok'));
    }
  }
  if (gates) writeFileSync(path.join(dir, 'gates.json'), JSON.stringify(gates, null, 2));
  const rows = ['id,entrada,saida_esperada,observacao', ...Array.from({ length: goldenRows }, (_, i) => `${i + 1},x,y,`)];
  writeFileSync(path.join(dir, 'golden-set.csv'), rows.join('\n') + '\n');
  return dir;
}

const HANDLES = ['ana', 'bruno', 'carla', 'diego', 'elisa'];
function squadWith(passedUpTo) {
  const s = emptySquad();
  Object.assign(s, { squad: 'multiplicadores', case: 'Fechamento do caixa', sponsor: 'Controladoria', coach: 'coach-x' });
  s.members = ROLES.map((role, i) => ({ github: HANDLES[i], role }));
  const by = { G0: 'Controladoria', G1: 'Controladoria', G2: 'coach-x', G3: 'coach-x', G4: 'Controladoria' };
  const roles = Object.fromEntries(ROLES.map((r, i) => [r, HANDLES[i]]));
  ['G0', 'G1', 'G2', 'G3', 'G4'].slice(0, passedUpTo).forEach((g, i) => {
    Object.assign(s.gates[g], { status: 'passed', attempts: 1, approvedBy: by[g], approvedAt: `2026-0${i + 1}-10` });
    if (['G1', 'G2', 'G3'].includes(g)) s.roles[g] = roles;
  });
  if (passedUpTo >= 2) Object.assign(s.gates.G1, { annualValue: 360000, annualRunCost: 60000 });
  if (passedUpTo >= 4) s.gates.G3.costPerTransaction = 0.04;
  if (passedUpTo >= 5) { s.gates.G4.decision = 'escalar'; s.assets = ['kit']; }
  return s;
}

test('the pristine template passes: pending fields are not errors', () => {
  const res = run('squad');
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /Gate atual: G0/);
  assert.match(res.stdout, /Dossiê: 0%/);
  assert.match(res.stdout, /case brief \(A\): 0% \(14 pendentes\)/);
});

test('a filled squad with every gate passed passes', () => {
  const res = run(squadDir({ fill: true, gates: squadWith(5), goldenRows: 60 }));
  assert.equal(res.status, 0, res.stdout);
  assert.match(res.stdout, /Dossiê: 100%/);
  assert.match(res.stdout, /Todos os gates aprovados/);
});

test('G2 passed with the ADR still pending is an error', () => {
  const res = run(squadDir({ fill: true, keep: ['B'], gates: squadWith(3), goldenRows: 60 }));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /erro: G2 aprovado, mas o ADR \(B\) ainda tem 9 campos pendentes\./);
});

test('G3 passed with 49 golden cases is an error', () => {
  const res = run(squadDir({ fill: true, gates: squadWith(4), goldenRows: 49 }));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /erro: G3 aprovado, mas o golden set tem 49 casos \(mínimo 50\)\./);
});

test('a broken gates.json contract is reported with the contract messages', () => {
  const bad = squadWith(0);
  bad.gates.G2.status = 'passed';
  const res = run(squadDir({ gates: bad }));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /erro: G2 não pode estar aprovado antes do G1\./);
});

test('a missing gates.json is an error', () => {
  const dir = squadDir();
  rmSync(path.join(dir, 'gates.json'));
  const res = run(dir);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /gates\.json não encontrado/);
});

test('an invalid JSON in gates.json is an error', () => {
  const dir = squadDir();
  writeFileSync(path.join(dir, 'gates.json'), '{nope');
  const res = run(dir);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /gates\.json não é um JSON válido/);
});

test('a missing document counts as fully pending, not as a crash', () => {
  const dir = squadDir();
  rmSync(path.join(dir, DOC_FILES.C));
  const res = run(dir);
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /pitch \(C\): 0% \(6 pendentes\)/);
});

function workflow() {
  const res = spawnSync(
    'python3',
    ['-c', 'import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', path.join(root, '.github', 'workflows', 'squad-check.yml')],
    { encoding: 'utf8' },
  );
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout);
}

test('the workflow checks every pull request and push, read-only', () => {
  const wf = workflow();
  assert.ok('pull_request' in wf.true && 'push' in wf.true);
  assert.deepEqual(wf.permissions, { contents: 'read' });
  assert.ok(wf.jobs.check.steps.some((s) => s.run && s.run.includes('node tools/check-squad.mjs')));
});
