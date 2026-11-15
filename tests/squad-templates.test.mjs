import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import squadLib from '../lib/squad.js';

const { DOCS, DOC_FILES, TEMPLATE_FIELDS, PENDING, countPending, section, validateSquad, dossierStatus } = squadLib;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, 'squad', rel), 'utf8');

test('each template has the planned number of pending fields', () => {
  for (const key of DOCS) {
    assert.equal(countPending(read(DOC_FILES[key])), TEMPLATE_FIELDS[key], `${DOC_FILES[key]} has the wrong number of ${PENDING}`);
  }
});

test('the ADR marks option 3 as optional and does not count it', () => {
  const adr = read(DOC_FILES.B);
  assert.match(adr, /## Opção 3[\s\S]*\[opcional\]/);
});

test('the SIS has the three review sections, each with three fields', () => {
  const sis = read(DOC_FILES.D);
  for (const key of ['g2', 'g3', 'd90']) {
    const text = section(sis, key);
    assert.ok(text, `missing section ${key}`);
    assert.equal(countPending(text), 3, key);
  }
});

test('the hearing card has the five seats', () => {
  const hearing = read(DOC_FILES.E);
  for (const seat of ['Patrocinador do negócio', 'Usuário final', 'Parte afetada', 'Compliance e risco', 'Operações de TI']) {
    assert.ok(hearing.includes(seat), seat);
  }
});

test('the pitch has the six parts of the 10-minute roteiro and the panel scorecard', () => {
  const pitch = read(DOC_FILES.C);
  assert.match(pitch, /\(1 min\)/);
  assert.match(pitch, /\(3 min\)/);
  assert.match(pitch, /Placar do painel executivo/);
  assert.ok(pitch.includes('Clareza do problema e do valor'));
});

test('gates.json is a valid pristine squad', () => {
  const gates = JSON.parse(read('gates.json'));
  assert.deepEqual(validateSquad(gates), { ok: true, errors: [] });
  assert.equal(gates.squad, '');
  for (const g of Object.values(gates.gates)) assert.equal(g.status, 'pending');
});

test('the pristine dossier is 0% filled', () => {
  const texts = Object.fromEntries(DOCS.map((k) => [k, read(DOC_FILES[k])]));
  const status = dossierStatus(texts);
  assert.equal(status.percent, 0);
  assert.equal(status.pending, 49);
});

test('golden-set.csv has only the header', () => {
  assert.equal(read('golden-set.csv').trim(), 'id,entrada,saida_esperada,observacao');
});

test('squad/README explains the workflow', () => {
  const readme = read('README.md');
  for (const needle of ['tools/check-squad.mjs', PENDING, 'gates.json', 'pull request', 'golden-set.csv', 'coach']) {
    assert.ok(readme.includes(needle), `README should mention "${needle}"`);
  }
});

test('no forbidden wording in the squad templates', () => {
  for (const f of ['gates.json', 'README.md', ...DOCS.map((k) => DOC_FILES[k])]) {
    assert.ok(!read(f).includes('Requirement-to-Solution'), f);
  }
});
