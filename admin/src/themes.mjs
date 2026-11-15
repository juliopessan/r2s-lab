/** Temas dos feedbacks, em ordem fixa. `outros` é o que sobra quando nenhum radical casa. */
export const THEMES = ['carga', 'mentoria', 'conteudo', 'sponsor', 'ferramentas', 'demo', 'outros'];

/** Radicais comparados sem acentos e sem diferenciar maiúsculas. */
const STEMS = {
  carga: ['carga', 'tempo', 'horas', 'ritmo', 'protegid'],
  mentoria: ['mentor', 'coach'],
  conteudo: ['conteudo', 'exercicio', 'modulo', 'material', 'aula', 'regra', 'caso'],
  sponsor: ['sponsor', 'patrocinador'],
  ferramentas: ['ferramenta', 'ambiente', 'sandbox', 'acesso', 'azure'],
  demo: ['demo', 'pitch', 'painel'],
};

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Temas de um texto, na ordem de THEMES; `[]` se o texto estiver vazio. */
export function themesFor(text) {
  const n = normalize(text).trim();
  if (!n) return [];
  const found = THEMES.filter((theme) => theme !== 'outros' && STEMS[theme].some((stem) => n.includes(stem)));
  return found.length ? found : ['outros'];
}
