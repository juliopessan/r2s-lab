#!/usr/bin/env node
// Copia os contratos de r2s-lab/lib e gera a squad de teste a partir dos templates de r2s-lab/squad.
// Uso: node scripts/sync-from-lab.mjs [..]
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const admin = path.join(here, '..');
const lab = path.resolve(process.argv[2] || path.join(admin, '..'));
const read = (file) => readFileSync(path.join(lab, file), 'utf8');

/* ---------- contratos copiados ---------- */
const SCHEMAS = { progress: 'r2s-progress/1', squad: 'r2s-squad/1', assessment: 'r2s-assessment/1' };
for (const name of ['progress', 'squad', 'assessment']) {
  const body = read(`lib/${name}.js`).replace("require('./progress.js')", "require('./progress.cjs')");
  const header = `// Copiado de r2s-lab/lib/${name}.js (${SCHEMAS[name]}). Não edite aqui.\n`;
  writeFileSync(path.join(admin, 'src', 'vendor', `${name}.cjs`), header + body);
}

/* ---------- fixture ---------- */
const require = createRequire(import.meta.url);
const squadLib = require(path.join(lab, 'lib', 'squad.js'));
const assessmentLib = require(path.join(lab, 'lib', 'assessment.js'));
const { emptySquad, DOC_FILES } = squadLib;
const { emptyAssessment, emptyMember, COMPETENCIES } = assessmentLib;

const out = path.join(admin, 'tests', 'fixtures', 'squads', 'multiplicadores', 'squad');
rmSync(path.join(admin, 'tests', 'fixtures', 'squads'), { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const fillAll = (text) => text.replaceAll('[preencher]', 'ok').replaceAll('[opcional]', 'ok');
const fillFirst = (text, n) => {
  let left = n;
  return text.replace(/\[preencher\]/g, (m) => (left-- > 0 ? 'ok' : m));
};
const fillSection = (text, heading) => {
  const start = text.indexOf(heading);
  const next = text.indexOf('\n## ', start + 1);
  const end = next === -1 ? text.length : next;
  return text.slice(0, start) + fillAll(text.slice(start, end)) + text.slice(end);
};

const docs = {
  A: fillAll(read(`squad/${DOC_FILES.A}`)),
  B: fillAll(read(`squad/${DOC_FILES.B}`)),
  C: fillFirst(read(`squad/${DOC_FILES.C}`), 3),
  D: fillSection(read(`squad/${DOC_FILES.D}`), '## Revisão no G2 (design)'),
  E: fillAll(read(`squad/${DOC_FILES.E}`)),
};
for (const key of Object.keys(docs)) writeFileSync(path.join(out, DOC_FILES[key]), docs[key]);

const rows = ['id,entrada,saida_esperada,observacao'];
for (let i = 1; i <= 60; i++) rows.push(`${i},entrada ${i},saida ${i},`);
writeFileSync(path.join(out, 'golden-set.csv'), rows.join('\n') + '\n');

const squad = emptySquad();
Object.assign(squad, { squad: 'multiplicadores', case: 'Fechamento do caixa', sponsor: 'Controladoria', coach: 'coach-exemplo' });
squad.members = [
  { github: 'anasouza', role: 'product-lead' },
  { github: 'brunolima', role: 'data-lead' },
  { github: 'carlamendes', role: 'ai-engineer' },
];
const roles = {
  'product-lead': 'anasouza', 'data-lead': 'brunolima', 'ai-engineer': 'carlamendes',
  'eval-risk-lead': 'carlamendes', storyteller: 'anasouza',
};
squad.roles = { G1: roles, G2: roles, G3: roles };
Object.assign(squad.gates.G0, { status: 'passed', attempts: 1, approvedBy: 'Controladoria', approvedAt: '2026-09-10' });
Object.assign(squad.gates.G1, {
  status: 'passed', attempts: 2, approvedBy: 'Controladoria', approvedAt: '2026-09-24', annualValue: 360000, annualRunCost: 60000,
});
Object.assign(squad.gates.G2, { status: 'passed', attempts: 1, approvedBy: 'coach-exemplo', approvedAt: '2026-10-08' });
Object.assign(squad.gates.G3, { status: 'in_review', attempts: 1 });
squad.assets = ['kit-de-avaliacao'];
writeFileSync(path.join(out, 'gates.json'), JSON.stringify(squad, null, 2) + '\n');

const assessment = emptyAssessment();
assessment.squadRubric = { framing: 3, design: 3, engineering: 3, evaluation: 2, cost: 3, communication: 3 };
assessment.sandbox = { capUsd: 300, spentUsd: 120 };
const comps = (n) => Object.fromEntries(COMPETENCIES.map((k) => [k, n]));
const member = (kc, coach, peer, attendance) => ({
  ...emptyMember(), labZeroCompleted: true, knowledgeCheckPct: kc, coachObservation: coach, peerReview: peer,
  attendancePct: attendance, competencies: { diagnostic: comps(2), final: comps(3) },
});
assessment.members = { anasouza: member(90, 4, 4, 95), brunolima: member(70, 3, 3, 90), carlamendes: member(60, 2, 3, 80) };
writeFileSync(path.join(out, 'assessment.json'), JSON.stringify(assessment, null, 2) + '\n');

console.log('contratos copiados e fixture gerada em', path.relative(admin, out));
