import squadLib from './vendor/squad.cjs';
import assessmentLib from './vendor/assessment.cjs';

const { DOCS, currentGate, dossierStatus, section, countPending } = squadLib;
const { squadScore, individualScore, finalScore, levelFor, competencyGain } = assessmentLib;

const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;
const mean = (list) => (list.length ? round1(list.reduce((a, b) => a + b, 0) / list.length) : null);
const percent = (part, total) => (total ? round1((part / total) * 100) : null);
const isoDate = (date) => date.toISOString().slice(0, 10);

function review90(gates, docs, now) {
  const g4 = gates.gates.G4;
  if (g4.status !== 'passed' || !g4.approvedAt) return { due: null, status: 'not_due' };
  const due = new Date(`${g4.approvedAt}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 90);
  const dueText = isoDate(due);
  const text = section(docs.D || '', 'd90');
  if (text && countPending(text) === 0) return { due: dueText, status: 'done' };
  return { due: dueText, status: isoDate(now) > dueText ? 'overdue' : 'pending' };
}

function squadRow(name, { gates, assessment, docs }, now) {
  const current = currentGate(gates);
  const passed = Object.values(gates.gates).filter((g) => g.status === 'passed');
  const status = dossierStatus(docs);
  return {
    squad: name,
    case: gates.case,
    members: gates.members.length,
    currentGate: current.gate,
    killed: current.killed,
    done: current.done,
    gatesPassed: passed.length,
    firstAttempt: { passed: passed.length, firstTry: passed.filter((g) => g.attempts === 1).length },
    dossier: {
      percent: status.percent,
      byDoc: Object.fromEntries(DOCS.map((key) => [key, status.byDoc[key].percent])),
    },
    decision: gates.gates.G4.decision,
    squadScore: assessment ? squadScore(assessment.squadRubric) : null,
    assets: gates.assets.length,
    review90: review90(gates, docs, now),
  };
}

const item = (key, group, label, unit, target, value, met) => ({
  key, group, label, value, unit, target,
  status: value === null ? 'not_measured' : met === null ? 'tracked' : met(value) ? 'met' : 'not_met',
});

/**
 * Linhas por squad, certificação e scorecard. Só leva usuários do GitHub (nunca nomes, e-mails nem o
 * patrocinador, que é texto livre). Só conta quem está na lista do RH e entre os membros da squad, uma vez só;
 * `issues` lista os conflitos.
 */
export function aggregateSquads({ roster, squads, now, target }) {
  const entries = Object.entries(squads || {});
  const rostered = new Set(roster.map((p) => p.github.toLowerCase()));

  const rows = entries.map(([name, data]) => squadRow(name, data, now));

  const evaluated = [];
  const issues = [];
  const counted = new Set();
  for (const [name, { gates, assessment }] of entries) {
    if (!assessment) continue;
    const members = new Set(gates.members.map((m) => m.github.toLowerCase()));
    for (const [handle, member] of Object.entries(assessment.members)) {
      const key = handle.toLowerCase();
      if (!rostered.has(key) || !members.has(key)) continue;
      if (counted.has(key)) {
        issues.push({ squad: name, message: `${key} está avaliado em mais de uma squad; só a primeira conta.` });
        continue;
      }
      counted.add(key);
      const score = squadScore(assessment.squadRubric);
      evaluated.push({
        github: handle.toLowerCase(), squad: name, member, assessment,
        level: levelFor(member, assessment.squadRubric),
        final: finalScore(score, individualScore(member)),
      });
    }
  }

  const byLevel = { none: 0, foundation: 0, practitioner: 0, lead: 0 };
  for (const e of evaluated) byLevel[e.level]++;
  const certification = {
    target,
    byLevel,
    trained: evaluated.filter((e) => e.level !== 'none').length,
    people: evaluated.map((e) => ({
      github: e.github, squad: e.squad, level: e.level, finalScore: e.final === null ? null : round2(e.final),
    })),
  };

  const passedGates = entries.flatMap(([, { gates }]) => Object.values(gates.gates).filter((g) => g.status === 'passed'));
  const withAssessment = entries.filter(([, { assessment }]) => assessment).map(([, { assessment }]) => assessment);
  const sandboxShares = withAssessment
    .filter((a) => a.sandbox.spentUsd !== null && a.sandbox.capUsd > 0)
    .map((a) => (a.sandbox.spentUsd / a.sandbox.capUsd) * 100);
  const gains = evaluated.map((e) => competencyGain(e.member)).filter((g) => g !== null);
  const attendance = evaluated.map((e) => e.member.attendancePct).filter((v) => v !== null);
  const closed = entries.filter(([, { gates }]) => gates.gates.G4.status === 'passed');
  const signed = entries.filter(([, { gates }]) => gates.gates.G1.status === 'passed');

  const scorecard = [
    item('attendance', 'leading', 'Presença média nos encontros', '%', '≥ 85%', mean(attendance), (v) => v >= 85),
    item('gatesFirstAttempt', 'leading', 'Gates aprovados na primeira tentativa', '%', '≥ 70%',
      percent(passedGates.filter((g) => g.attempts === 1).length, passedGates.length), (v) => v >= 70),
    item('sandbox', 'leading', 'Uso do teto do sandbox (maior squad)', '%', '≤ 100%',
      sandboxShares.length ? round1(Math.max(...sandboxShares)) : null, (v) => v <= 100),
    item('competencyGain', 'learning', 'Ganho médio nas competências', 'níveis', '≥ 1 nível', mean(gains), (v) => v >= 1),
    item('practitionerRate', 'learning', 'Avaliados no nível Practitioner ou Lead', '%', '≥ 80%',
      percent(evaluated.filter((e) => e.level === 'practitioner' || e.level === 'lead').length, evaluated.length), (v) => v >= 80),
    item('sponsorDecision', 'business', 'Decisões do patrocinador pela escala', '%', '≥ 50%',
      percent(closed.filter(([, { gates }]) => gates.gates.G4.decision === 'escalar').length, closed.length), (v) => v >= 50),
    item('valueSigned', 'business', 'Valor anual assinado no G1', 'BRL', 'Acompanhar',
      signed.length ? signed.reduce((sum, [, { gates }]) => sum + (gates.gates.G1.annualValue || 0), 0) : null, null),
    item('assets', 'business', 'Ativos reutilizáveis por squad encerrada', '', '≥ 1 por squad',
      closed.length ? round1(closed.reduce((sum, [, { gates }]) => sum + gates.assets.length, 0) / closed.length) : null, (v) => v >= 1),
    item('mobility', 'mobility', 'Mobilidade interna', '', 'A definir', null, null),
    item('delivery', 'delivery', 'Tempo até o primeiro PoC', '', 'A definir', null, null),
  ];

  return { squads: rows, certification, scorecard, issues };
}
