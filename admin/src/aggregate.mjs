import progress from './vendor/progress.cjs';
import { themesFor } from './themes.mjs';
import { aggregateAcademy } from './academy.mjs';

const { TOTAL_MIN, RATINGS, preworkMinutes } = progress;

const STAGES = [
  ['invited', 'Convidados'],
  ['started', 'Iniciaram'],
  ['preworkDone', 'Concluíram o pre-work'],
  ['surveyDone', 'Responderam a pesquisa'],
];
const TOPICS = ['melhor', 'mudar', 'aplicou'];

const round1 = (v) => Math.round(v * 10) / 10;
const average = (list) => (list.length ? round1(list.reduce((a, b) => a + b, 0) / list.length) : null);

/** Iniciou = pelo menos um bloco, um quiz respondido ou a autoavaliação. */
function hasStarted(p) {
  if (!p) return false;
  return (
    Object.keys(p.prework.blocks).length > 0 ||
    Object.values(p.prework.quizzes).some((q) => q.answered > 0) ||
    Boolean(p.selfAssessment)
  );
}

const hasFinished = (p) => Boolean(p) && preworkMinutes(p) === TOTAL_MIN;

function countGroup(rows) {
  return {
    invited: rows.length,
    started: rows.filter((r) => hasStarted(r.p)).length,
    preworkDone: rows.filter((r) => hasFinished(r.p)).length,
  };
}

/**
 * Agrega as métricas do painel v1. A saída nunca leva e-mail; o nome de uma pessoa só aparece
 * como `author` de um feedback cujo consentimento é `nome`.
 */
export function aggregate({ roster, progressByHandle, missing, errors, unread = [], target, protectedHoursPerWeek, now }) {
  const files = new Map(Object.entries(progressByHandle || {}).map(([handle, p]) => [handle.toLowerCase(), p]));
  const rows = roster.map((person) => ({ person, p: files.get(person.github.toLowerCase()) || null }));

  const everyone = countGroup(rows);
  const surveyRows = rows.filter((r) => r.p && r.p.survey);
  const totals = {
    ...everyone,
    surveyDone: surveyRows.length,
    missing: everyone.invited - everyone.preworkDone,
    unread: unread.length,
  };
  const funnel = STAGES.map(([key, label]) => ({ key, label, count: totals[key] }));

  const ondas = [...new Set(rows.map((r) => r.person.onda))].sort((a, b) => a - b);
  const byWave = ondas.map((onda) => ({ onda, ...countGroup(rows.filter((r) => r.person.onda === onda)) }));
  const multipliers = countGroup(rows.filter((r) => r.person.multiplicador));

  const surveys = surveyRows.map((r) => r.p.survey);
  const promoters = surveys.filter((s) => s.nps >= 9).length;
  const detractors = surveys.filter((s) => s.nps <= 6).length;
  const satisfaction = {
    respondents: surveys.length,
    nps: surveys.length ? Math.round(((promoters - detractors) / surveys.length) * 100) : null,
    promoters,
    passives: surveys.length - promoters - detractors,
    detractors,
    ratings: Object.fromEntries(RATINGS.map((key) => [key, average(surveys.map((s) => s.ratings[key]))])),
    hoursPerWeek: { average: average(surveys.map((s) => s.hoursPerWeek)), protected: protectedHoursPerWeek },
  };

  /* Ordem e ids sem relação com a lista do RH: nem o `id` nem a posição entregam o usuário do GitHub
   * de quem não consentiu o nome. */
  const entries = [];
  for (const { person, p } of surveyRows) {
    for (const topic of TOPICS) {
      const text = String(p.survey.open[topic] || '').trim();
      if (!text) continue;
      const consent = p.survey.consent;
      entries.push({
        topic,
        text,
        themes: themesFor(text),
        consent,
        author: consent === 'nome' ? person.nome : null,
        quotable: consent === 'anon' || consent === 'nome',
      });
    }
  }
  entries.sort((a, b) => TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic) || a.text.localeCompare(b.text, 'pt-BR'));
  const feedback = entries.map((entry, i) => ({ id: `fb-${i + 1}`, ...entry }));

  return {
    generatedAt: now.toISOString(),
    target,
    totals,
    funnel,
    byWave,
    multipliers,
    satisfaction,
    feedback,
    academy: aggregateAcademy(rows),
    dataQuality: { missingFiles: [...(missing || [])], errors: [...(errors || [])], unread: [...unread] },
  };
}
