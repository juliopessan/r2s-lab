import progress from './vendor/progress.cjs';

const { PREWORK_BLOCKS } = progress;

/** Ids e nomes dos cursos da R2S Academy, na ordem do catálogo (pre-work e jornada da squad). */
export const ACADEMY_COURSES = [
  ['p1', 'GenAI na prática'], ['p2', 'Do pedido ao problema'], ['p3', 'Valor e custo'],
  ['p4', 'Responsabilidade e decisão'], ['p5', 'Exercício final'],
  ['s1', 'Intake e o G0'], ['s2', 'Discover: ouvir antes de resolver'], ['s3', 'Frame Value e o G1'],
  ['s4', 'Design e o G2'], ['s5', 'Build, Evaluate e o G3'], ['s6', 'Pitch, decisão e o G4'],
].map(([id, title]) => ({ id, title, family: id[0] === 'p' ? 'prework' : 'squad' }));

/** Selos de uma pessoa: os do pre-work vêm dos blocos (mesmo sem abrir a Academy); os da squad, da seção academy. */
export function badgesOf(p) {
  if (!p) return {};
  const out = {};
  for (let part = 1; part <= 5; part++) {
    const ids = PREWORK_BLOCKS.filter((b) => b.part === part).map((b) => b.id);
    if (ids.every((id) => p.prework.blocks[id] === true)) out['p' + part] = (p.academy && p.academy.selos['p' + part]) || null;
  }
  const selos = (p.academy && p.academy.selos) || {};
  for (const [id, date] of Object.entries(selos)) if (id[0] === 's') out[id] = date;
  return out;
}

/** Métricas da Academy para o painel: só contagens e ids de curso, nunca nomes. */
export function aggregateAcademy(rows) {
  const per = Object.fromEntries(ACADEMY_COURSES.map((c) => [c.id, 0]));
  let people = 0;
  let badges = 0;
  let squadLessonsRead = 0;
  let readers = 0;
  for (const { p } of rows) {
    const b = badgesOf(p);
    const ids = Object.keys(b);
    if (ids.length) people++;
    badges += ids.length;
    for (const id of ids) per[id]++;
    const lidas = (p && p.academy && p.academy.lidas) || [];
    if (lidas.length) { readers++; squadLessonsRead += lidas.length; }
  }
  return {
    invited: rows.length,
    peopleWithBadge: people,
    badges,
    squadReaders: readers,
    squadLessonsRead,
    courses: ACADEMY_COURSES.map((c) => ({ id: c.id, title: c.title, family: c.family, badges: per[c.id] })),
  };
}
