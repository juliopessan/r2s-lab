import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import browser from './helpers/browser.cjs';

const { withPage } = browser;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = 'academy/index.html';
const COURSE = (c) => `academy/curso.html?c=${c}`;
const LESSON = (c, l) => `academy/licao.html?c=${c}&l=${l}`;
const BADGE = (c) => `academy/selo.html?c=${c}`;
const text = async (page, sel) => (await page.locator(sel).innerText()).replace(/\s+/g, ' ').trim();
const rows = async (page, sel) => (await page.locator(sel).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
const KEY = 'r2s-progress-v1';

/** Estado salvo como o pre-work o grava. */
const seed = (page, blocks) =>
  page.addInitScript(([key, b]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const state = { schema: 'r2s-progress/1', github: '', updatedAt: new Date().toISOString(), prework: { blocks: b, quizzes: {} }, selfAssessment: null, survey: null };
    localStorage.setItem(key, JSON.stringify(state));
  }, [KEY, blocks]);
const savedBlocks = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{"prework":{"blocks":{}}}').prework.blocks, KEY);

/* ---------- conteúdo gerado a partir do pre-work ---------- */

test('the lesson content is in sync with the pre-work page', () => {
  const res = spawnSync('node', [path.join(root, 'tools', 'build-academy.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

test('every pre-work block becomes a lesson with its text, exercise and references', async () => {
  const { extract } = await import('../tools/build-academy.mjs');
  const content = extract(readFileSync(path.join(root, '00-prework', 'index.html'), 'utf8'));
  assert.deepEqual(Object.keys(content.lessons), ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '4.1', '4.2', '5.1', '5.2']);
  assert.equal(content.parts.length, 5);
  const l11 = content.lessons['1.1'];
  assert.equal(l11.title, 'Como um LLM gera texto');
  assert.equal(l11.min, 45);
  assert.match(l11.body[0].text, /prever o próximo token/);
  assert.equal(l11.exercise.label, 'Fazer · 15 min');
  assert.equal(l11.refs[0].title, 'Understand tokens');
  assert.deepEqual(l11.quizzes, ['m1_llm']);
  assert.deepEqual(content.lessons['1.3'].body.map((b) => b.type), ['p', 'ladder', 'p']);
  assert.equal(content.lessons['2.3'].body.find((b) => b.type === 'tree').items[0].children.length, 4);
  assert.equal(content.lessons['3.1'].body.find((b) => b.type === 'table').rows.length, 3);
  assert.equal(content.lessons['4.2'].body.find((b) => b.type === 'pitch').items.length, 6);
});

/* ---------- página inicial ---------- */

test('the home has the question, the search and five course cards', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await page.title(), 'R2S Academy');
    assert.equal(await text(page, 'h1'), 'O que você quer aprender?');
    assert.equal(await page.locator('#busca').count(), 1);
    assert.equal(await page.locator('#cursos li.curso').count(), 5);
  });
});

test('each card shows type, lessons, quizzes and duration', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#cursos li.curso .curso-meta'), [
      'Curso · 3 lições · 3 quizzes · 2 h 30',
      'Curso · 3 lições · 2 quizzes · 1 h 45',
      'Curso · 3 lições · 3 quizzes · 1 h 30',
      'Curso · 2 lições · 1 quiz · 1 h 15',
      'Curso · 2 lições · 1 h',
    ]);
    assert.deepEqual(await rows(page, '#cursos li.curso .curso-titulo'), ['GenAI na prática', 'Do pedido ao problema', 'Valor e custo', 'Responsabilidade e decisão', 'Exercício final']);
    assert.equal(await page.locator('#cursos li.curso .badge').count(), 5, 'every card carries its badge art');
  });
});

test('the search filters the cards and ignores accents and case', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    await page.fill('#busca', 'PITCH');
    assert.deepEqual(await rows(page, '#cursos li.curso .curso-titulo'), ['Responsabilidade e decisão']);
    await page.fill('#busca', 'arvore de kpi');
    assert.deepEqual(await rows(page, '#cursos li.curso .curso-titulo'), ['Do pedido ao problema'], 'lesson text is searchable too');
    await page.fill('#busca', 'xyzzy');
    assert.equal(await page.locator('#cursos li.curso').count(), 0);
    assert.equal(await text(page, '#sem-resultado'), 'Nenhum curso encontrado.');
    await page.fill('#busca', '');
    assert.equal(await page.locator('#cursos li.curso').count(), 5);
    assert.equal(await page.locator('#sem-resultado').isVisible(), false);
  });
});

test('the theme cards filter the catalog', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#temas li.tema .tema-titulo'), ['Fundamentos', 'Valor e decisão', 'Case brief', 'Lab Loop da squad']);
    await page.click('#temas li.tema:nth-child(2) button');
    assert.deepEqual(await rows(page, '#cursos li.curso .curso-titulo'), ['Valor e custo', 'Responsabilidade e decisão']);
    assert.equal(await page.locator('#jornada').isVisible(), false, 'the squad section hides when none of its courses match');
    await page.click('#temas li.tema:nth-child(2) button');
    assert.equal(await page.locator('#cursos li.curso').count(), 5, 'a second click clears the filter');
    await page.click('#temas li.tema:nth-child(4) button');
    assert.equal(await page.locator('#cursos-squad li.curso').count(), 6);
    assert.equal(await page.locator('#fluencia').isVisible(), false);
  });
});

test('a card shows progress and links to the course', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '1.1': true, '1.2': true });
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await text(page, '#cursos li.curso:nth-child(1) .curso-progresso'), '2 de 3 lições');
    assert.equal(await text(page, '#cursos li.curso:nth-child(2) .curso-progresso'), 'Não iniciado');
    assert.match(await page.getAttribute('#cursos li.curso:nth-child(1) a', 'href'), /curso\.html\?c=p1$/);
  });
});

test('the badge collection shows earned and locked badges', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await text(page, '#selos-resumo'), '0 de 11 selos. Conclua um curso para ganhar o primeiro.');
    assert.equal(await page.locator('#selos li.selo').count(), 11);
    assert.equal(await page.locator('#selos li.selo.ganho').count(), 0);
  });
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true, '5.2': true });
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await text(page, '#selos-resumo'), '1 de 11 selos.');
    assert.deepEqual(await rows(page, '#selos li.selo.ganho'), ['Exercício final Concluído']);
    assert.match(await text(page, '#selos li.selo:not(.ganho) >> nth=0'), /Bloqueado/);
  });
});

/* ---------- página do curso ---------- */

test('the course page has the hero, the pills and the badge', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + COURSE('p1'), { waitUntil: 'load' });
    assert.equal(await text(page, 'h1'), 'GenAI na prática');
    assert.equal(await page.title(), 'GenAI na prática · R2S Academy');
    assert.equal(await text(page, '#migalhas'), 'Academy / Cursos');
    assert.deepEqual(await rows(page, '#meta .pilula'), ['3 lições', '2 h 30', '3 quizzes', 'Selo de conclusão']);
    assert.equal(await page.locator('.faixa .badge').count(), 1);
    assert.equal(await text(page, '#cta'), 'Começar curso');
    assert.match(await page.getAttribute('#cta', 'href'), /licao\.html\?c=p1&l=1\.1$/);
  });
});

test('the course page lists what you will learn, who it is for and the lessons', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '1.1': true });
    await page.goto(url + COURSE('p1'), { waitUntil: 'load' });
    assert.equal(await page.locator('#aprender li').count(), 3);
    assert.ok((await text(page, '#publico')).length > 10);
    assert.ok(await page.locator('#antes li').count() >= 1);
    assert.match(await text(page, '#intro'), /Ao final você explica/);
    assert.deepEqual(await rows(page, '#licoes li.licao .licao-titulo'), ['Como um LLM gera texto', 'Prompting que funciona', 'Regra, ML, LLM ou agente?']);
    assert.deepEqual(await rows(page, '#licoes li.licao .licao-min'), ['45 min', '60 min', '45 min']);
    assert.deepEqual(await rows(page, '#licoes li.licao .licao-estado'), ['Concluída', 'Pendente', 'Pendente']);
    assert.equal(await text(page, '#progresso'), '1 de 3 lições · 45 de 150 min');
    assert.equal(await text(page, '#cta'), 'Continuar');
    assert.match(await page.getAttribute('#cta', 'href'), /l=1\.2$/, 'continue goes to the first pending lesson');
    assert.equal(await page.locator('#selo').isVisible(), false);
  });
});

test('the outline lists lessons, quizzes and the completion badge', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + COURSE('p1'), { waitUntil: 'load' });
    const items = await rows(page, '#outline li');
    assert.deepEqual(items, ['Como um LLM gera texto Quiz', 'Prompting que funciona Quiz', 'Regra, ML, LLM ou agente? Quiz', 'Selo de conclusão']);
  });
});

test('a finished course shows the earned badge and Revisar', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true, '5.2': true });
    await page.goto(url + COURSE('p5'), { waitUntil: 'load' });
    assert.equal(await page.locator('#selo').isVisible(), true);
    assert.match(await text(page, '#selo'), /Exercício final/);
    assert.match(await text(page, '#selo'), /Concluído/);
    assert.equal(await text(page, '#cta'), 'Revisar');
    assert.equal(await page.locator('.faixa .badge.ganho').count(), 1);
  });
});

test('an unknown course shows a way back', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + COURSE('nada'), { waitUntil: 'load' });
    assert.match(await text(page, '#nao-encontrado'), /Curso não encontrado/);
    assert.match(await page.getAttribute('#nao-encontrado a', 'href'), /index\.html$/);
  });
});

/* ---------- página da lição ---------- */

test('the lesson page shows the breadcrumb, pills and the content from the pre-work', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p1', '1.3'), { waitUntil: 'load' });
    assert.equal(await text(page, 'h1'), 'Regra, ML, LLM ou agente?');
    assert.equal(await page.title(), 'Regra, ML, LLM ou agente? · R2S Academy');
    assert.equal(await text(page, '#migalhas'), 'Academy / Cursos / GenAI na prática');
    assert.deepEqual(await rows(page, '#meta .pilula'), ['Lição 3', '45 min']);
    assert.match(await text(page, '#conteudo-licao'), /técnica mais barata que funciona/);
    assert.deepEqual(await rows(page, '#conteudo-licao .escada li'), ['Regra $', 'ML $$', 'LLM $$$', 'Agente $$$$']);
    assert.match(await text(page, '#conteudo-licao .fazer'), /Fazer · 10 min/i);
    assert.match(await page.getAttribute('#conteudo-licao .pratica a', 'href'), /00-prework\/index\.html#p1h$/);
  });
});

test('tables, trees and the pitch are rendered as structure, not raw text', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p3', '3.1'), { waitUntil: 'load' });
    assert.equal(await page.locator('#conteudo-licao table tr').count(), 3);
    await page.goto(url + LESSON('p2', '2.3'), { waitUntil: 'load' });
    assert.equal(await page.locator('#conteudo-licao .arvore li li').count(), 4);
    assert.equal(await page.locator('#conteudo-licao .arvore li.ia').count(), 1);
    await page.goto(url + LESSON('p4', '4.2'), { waitUntil: 'load' });
    assert.equal(await page.locator('#conteudo-licao .pitch li').count(), 6);
  });
});

test('the side card says where you are and the table of contents links to the sections', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p1', '1.1'), { waitUntil: 'load' });
    assert.equal(await text(page, '#posicao .posicao-onde'), 'Lição 1 de 3 · GenAI na prática');
    assert.equal(await text(page, '#posicao .posicao-titulo'), 'Como um LLM gera texto');
    const toc = await rows(page, '#sumario a');
    assert.deepEqual(toc, ['Ideia central', 'Na prática', 'Para ir além']);
    for (const href of await page.locator('#sumario a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      assert.equal(await page.locator(href).count(), 1, href);
    }
    await page.click('#posicao button');
    assert.deepEqual(await rows(page, '#posicao-lista a'), ['Como um LLM gera texto', 'Prompting que funciona', 'Regra, ML, LLM ou agente?']);
    assert.equal(await page.getAttribute('#posicao button', 'aria-expanded'), 'true');
  });
});

test('previous and next lesson cards, and the last lesson leads to the badge', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p1', '1.1'), { waitUntil: 'load' });
    assert.equal(await page.locator('#anterior').count(), 0);
    assert.equal(await text(page, '#proxima'), 'Próxima lição Prompting que funciona');
    await page.click('#proxima');
    await page.waitForURL(/l=1\.2/);
    assert.equal(await text(page, '#anterior'), 'Lição anterior Como um LLM gera texto');
    await page.goto(url + LESSON('p1', '1.3'), { waitUntil: 'load' });
    assert.equal(await text(page, '#proxima'), 'Selo de conclusão GenAI na prática');
    assert.match(await page.getAttribute('#proxima', 'href'), /curso\.html\?c=p1$/);
  });
});

test('marking a lesson complete saves it in the same state the pre-work uses', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p2', '2.1'), { waitUntil: 'load' });
    assert.equal(await text(page, '#concluir'), 'Marcar como concluída');
    assert.equal(await page.getAttribute('#concluir', 'aria-pressed'), 'false');
    await page.click('#concluir');
    assert.equal(await text(page, '#concluir'), 'Concluída');
    assert.equal(await page.getAttribute('#concluir', 'aria-pressed'), 'true');
    assert.deepEqual(await savedBlocks(page), { '2.1': true });
    await page.click('#concluir');
    assert.deepEqual(await savedBlocks(page), {}, 'a second click undoes it');
  });
});

test('marking a lesson complete keeps what another tab saved', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p2', '2.1'), { waitUntil: 'load' });
    await page.evaluate((key) => {
      const s = JSON.parse(localStorage.getItem(key) || 'null') || { schema: 'r2s-progress/1', github: '', updatedAt: '', prework: { blocks: {}, quizzes: {} }, selfAssessment: null, survey: null };
      s.prework.blocks['1.1'] = true;
      s.github = 'anasouza';
      localStorage.setItem(key, JSON.stringify(s));
    }, KEY);
    await page.click('#concluir');
    assert.deepEqual(await savedBlocks(page), { '1.1': true, '2.1': true });
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).github, KEY), 'anasouza');
  });
});

test('finishing the last lesson of a course announces the badge', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true });
    await page.goto(url + LESSON('p5', '5.2'), { waitUntil: 'load' });
    assert.equal(await page.locator('#conquista').isVisible(), false);
    await page.click('#concluir');
    assert.equal(await page.locator('#conquista').isVisible(), true);
    assert.match(await text(page, '#conquista'), /Você ganhou o selo Exercício final/);
    assert.equal(await page.locator('#conquista .badge.ganho').count(), 1);
  });
});

test('the progress notice can be dismissed and stays dismissed', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p1', '1.1'), { waitUntil: 'load' });
    assert.match(await text(page, '#aviso-progresso'), /Seu progresso fica neste navegador/);
    await page.click('#aviso-progresso button');
    assert.equal(await page.locator('#aviso-progresso').isVisible(), false);
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('#aviso-progresso').isVisible(), false);
  });
});

test('the helpful question records one answer', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p1', '1.1'), { waitUntil: 'load' });
    assert.equal(await text(page, '#ajudou p'), 'Isso ajudou?');
    await page.click('#ajudou button[data-valor="sim"]');
    assert.equal(await page.getAttribute('#ajudou button[data-valor="sim"]', 'aria-pressed'), 'true');
    assert.equal(await page.getAttribute('#ajudou button[data-valor="nao"]', 'aria-pressed'), 'false');
    assert.match(await text(page, '#ajudou-msg'), /Obrigado/);
  });
});

test('an unknown lesson shows a way back', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('p1', '9.9'), { waitUntil: 'load' });
    assert.match(await text(page, '#nao-encontrado'), /Lição não encontrada/);
  });
});

/* ---------- selo de conclusão ---------- */

const svgText = (page, sel) => page.locator(sel).evaluate((n) => n.textContent.replace(/\s+/g, ' ').trim());

test('an earned badge follows the Academy completion badge layout', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true, '5.2': true });
    await page.goto(url + BADGE('p5'), { waitUntil: 'load' });
    assert.equal(await page.title(), 'Selo Exercício final · R2S Academy');
    assert.equal(await svgText(page, '#arte-selo textPath'), 'SELO DE CONCLUSÃO DE CURSO');
    assert.equal(await svgText(page, '#selo-curso'), 'Exercício final');
    assert.equal(await svgText(page, '#selo-nome'), 'Seu nome');
    assert.match(await svgText(page, '#selo-data'), /^EMITIDO EM \d{1,2} DE [A-ZÇ]+ DE \d{4}$/);
    assert.match(await svgText(page, '#arte-selo'), /Concedido a/);
    assert.match(await svgText(page, '#arte-selo'), /R2S Academy/);
    assert.match(await text(page, '#estado'), /Você concluiu Exercício final em/);
  });
});

test('the name typed on the badge page goes on the badge and is remembered', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true, '5.2': true });
    await page.goto(url + BADGE('p5'), { waitUntil: 'load' });
    await page.fill('#nome-selo', 'Ana Souza');
    assert.equal(await svgText(page, '#selo-nome'), 'Ana Souza');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.inputValue('#nome-selo'), 'Ana Souza');
    assert.equal(await svgText(page, '#selo-nome'), 'Ana Souza');
    const progress = await page.evaluate((key) => localStorage.getItem(key), KEY);
    assert.ok(!progress.includes('Ana Souza'), 'the name never enters the exportable progress');
  });
});

test('a long course title wraps into two lines on the badge', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '4.1': true, '4.2': true });
    await page.goto(url + BADGE('p4'), { waitUntil: 'load' });
    assert.deepEqual(await page.locator('#selo-curso tspan').allTextContents(), ['Responsabilidade', 'e decisão']);
  });
});

test('every course has its own icon, and the colour encodes the family', async () => {
  const seen = new Set();
  const fills = {};
  for (const c of ['p1', 'p2', 'p3', 'p4', 'p5', 's1', 's2', 's3', 's4', 's5', 's6']) {
    await withPage({}, async (page, url) => {
      await page.goto(url + BADGE(c), { waitUntil: 'load' });
      const sig = await page.evaluate(() => {
        const svg = document.querySelector('#selo-svg');
        return { fill: svg.querySelector('rect').getAttribute('fill'), icon: [...svg.querySelectorAll('.selo-icone path')].map((p) => p.getAttribute('d')).join('|') };
      });
      seen.add(sig.icon);
      fills[c] = sig.fill;
    });
  }
  assert.equal(seen.size, 11);
  assert.deepEqual(['p1', 'p2', 'p3', 'p4', 'p5'].map((c) => fills[c]), Array(5).fill('#FF5800'), 'the pre-work family is Avanade Glow');
  assert.deepEqual(['s1', 's2', 's3', 's4', 's5', 's6'].map((c) => fills[c]), ['#FFD700', '#FFB414', '#FF5800', '#B43C14', '#C80000', '#890078'], 'the squad journey runs Solar to Aurora');
});

test('a locked badge says what is missing and hides the name field', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '1.1': true });
    await page.goto(url + BADGE('p1'), { waitUntil: 'load' });
    assert.equal(await text(page, '#estado'), 'Bloqueado. Conclua 2 lições de GenAI na prática para ganhar este selo.');
    assert.equal(await page.locator('#nome-selo').isVisible(), false);
    assert.equal(await page.locator('#arte-selo.bloqueado').count(), 1);
    assert.match(await page.getAttribute('#ir-curso', 'href'), /curso\.html\?c=p1$/);
  });
});

test('the course, the outline, the collection and the lesson all lead to the badge page', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true });
    await page.goto(url + LESSON('p5', '5.2'), { waitUntil: 'load' });
    await page.click('#concluir');
    assert.match(await page.getAttribute('#conquista a', 'href'), /selo\.html\?c=p5$/);
    await page.goto(url + COURSE('p5'), { waitUntil: 'load' });
    assert.match(await page.getAttribute('#selo a', 'href'), /selo\.html\?c=p5$/);
    assert.match(await page.getAttribute('#outline li:last-child a', 'href'), /selo\.html\?c=p5$/);
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.match(await page.getAttribute('#selos li.selo.ganho a', 'href'), /selo\.html\?c=p5$/);
    await page.goto(url + BADGE('p5'), { waitUntil: 'load' });
    const today = await page.evaluate(() => new Date().getDate());
    assert.match(await svgText(page, '#selo-data'), new RegExp('^EMITIDO EM ' + today + ' DE'));
  });
});

test('the badge prints alone on an A4 landscape page', () => {
  const css = readFileSync(path.join(root, 'css', 'academy.css'), 'utf8');
  assert.match(css, /@page\s*\{[^}]*A4 landscape/);
  assert.match(css, /@media print[^{]*\{[\s\S]*\.noprint[^}]*display:\s*none/);
});

/* ---------- jornada da squad ---------- */

test('the dossier templates are read from squad/ with the same field counts the checker uses', async () => {
  const { readTemplates } = await import('../tools/build-academy.mjs');
  const squadLib = (await import('../lib/squad.js')).default;
  const t = readTemplates();
  for (const [k, n] of Object.entries(squadLib.TEMPLATE_FIELDS)) {
    const count = t[k].sections.reduce((a, s) => a + s.fields.filter((f) => !f.optional).length, 0);
    assert.equal(count, n, k);
  }
  assert.equal(t.B.sections.find((s) => s.heading === 'Opção 3').fields[0].optional, true);
});

test('the home lists six squad courses after the pre-work', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await text(page, '#jornada-titulo'), 'A jornada da squad');
    assert.deepEqual(await rows(page, '#cursos-squad li.curso .curso-titulo'), [
      'Intake e o G0', 'Discover: ouvir antes de resolver', 'Frame Value e o G1', 'Design e o G2', 'Build, Evaluate e o G3', 'Pitch, decisão e o G4',
    ]);
    assert.deepEqual(await rows(page, '#cursos-squad li.curso .curso-meta'), [
      'Curso · 3 lições · 45 min', 'Curso · 2 lições · 35 min', 'Curso · 2 lições · 35 min',
      'Curso · 3 lições · 1 h', 'Curso · 2 lições · 40 min', 'Curso · 3 lições · 55 min',
    ]);
    await page.fill('#busca', 'golden set');
    assert.deepEqual(await rows(page, '#cursos-squad li.curso .curso-titulo'), ['Build, Evaluate e o G3']);
    assert.equal(await page.locator('#cursos li.curso').count(), 0);
  });
});

test('a squad course page has the same structure as the pre-work courses', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + COURSE('s1'), { waitUntil: 'load' });
    assert.equal(await text(page, 'h1'), 'Intake e o G0');
    assert.deepEqual(await rows(page, '#meta .pilula'), ['3 lições', '45 min', 'Selo de conclusão']);
    assert.deepEqual(await rows(page, '#licoes li.licao .licao-titulo'), ['O Lab Loop em uma página', 'O case brief', 'O G0: o caso entra']);
    assert.match(await page.getAttribute('#cta', 'href'), /licao\.html\?c=s1&l=s1\.1$/);
    assert.equal(await page.locator('.faixa.t-s1').count(), 1);
  });
});

test('the Lab Loop lesson shows the seven stages and the five gates', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('s1', 's1.1'), { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#conteudo-licao .etapas li .etapa-nome'), ['Intake', 'Discover', 'Frame Value', 'Design', 'Build', 'Evaluate', 'Pitch & Hand off']);
    assert.deepEqual(await rows(page, '#conteudo-licao .etapas .etapa-gate'), ['G0', 'G1', 'G2', 'G3', 'G4']);
    assert.equal(await page.locator('#conteudo-licao table tr').count(), 5);
  });
});

test('a lesson shows the dossier template fields straight from squad/', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('s1', 's1.2'), { waitUntil: 'load' });
    assert.match(await text(page, '#conteudo-licao .modelo-cabeca'), /^MODELO A · CASE BRIEF/i);
    assert.equal(await page.locator('#conteudo-licao .modelo-campos li').count(), 14);
    assert.match(await page.getAttribute('#conteudo-licao .pratica a', 'href'), /\.\.\/squad\/A-case-brief\.md$/);
    await page.goto(url + LESSON('s3', 's3.1'), { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#conteudo-licao .modelo-secao'), ['Métrica e baseline', 'Hipótese de valor']);
  });
});

test('squad lessons go to the academy section of the exported progress, never to the pre-work blocks', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + LESSON('s2', 's2.1'), { waitUntil: 'load' });
    await page.click('#concluir');
    await page.goto(url + LESSON('s2', 's2.2'), { waitUntil: 'load' });
    await page.click('#concluir');
    assert.match(await text(page, '#conquista'), /Você ganhou o selo Discover: ouvir antes de resolver/);
    assert.deepEqual(await savedBlocks(page), {});
    const academy = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).academy, KEY);
    assert.deepEqual(academy.lidas, ['s2.1', 's2.2']);
    assert.match(academy.selos.s2, /^\d{4}-\d{2}-\d{2}$/);
    await page.goto(url + COURSE('s2'), { waitUntil: 'load' });
    assert.equal(await text(page, '#cta'), 'Revisar');
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#selos li.selo.ganho .selo-titulo'), ['Discover: ouvir antes de resolver']);
  });
});

/* ---------- alinhamento dos selos ---------- */

test('on every badge the icon is centred, the title is centred and fits, and the arc sits inside the polygon', async () => {
  for (const c of ['p1', 'p2', 'p3', 'p4', 'p5', 's1', 's2', 's3', 's4', 's5', 's6']) {
    await withPage({}, async (page, url) => {
      await page.goto(url + BADGE(c), { waitUntil: 'load' });
      const m = await page.evaluate(() => {
        const svg = document.querySelector('#selo-svg');
        const g = svg.querySelector('.selo-icone');
        const ib = g.getBBox();
        const t = svg.querySelector('#selo-curso').getBBox();
        const poly = svg.querySelector('.selo-poligono');
        const tp = svg.querySelector('.selo-arco');
        const n = tp.getNumberOfChars();
        const ends = [tp.getStartPositionOfChar(0), tp.getEndPositionOfChar(n - 1)];
        const inside = ends.every((p) => { const pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y; return poly.isPointInFill(pt); });
        const tPts = [[t.x, t.y + t.height / 2], [t.x + t.width, t.y + t.height / 2]].every(([x, y]) => { const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; return poly.isPointInFill(pt); });
        return { icx: ib.x + ib.width / 2, icy: ib.y + ib.height / 2, side: Math.max(ib.width, ib.height), tcx: t.x + t.width / 2, tw: t.width, inside, tPts };
      });
      assert.ok(Math.abs(m.icx) < 1 && Math.abs(m.icy) < 1, `${c}: icon centre ${m.icx},${m.icy}`);
      assert.ok(Math.abs(m.side - 118) < 1, `${c}: icon size ${m.side}`);
      assert.ok(Math.abs(m.tcx - 550) < 1, `${c}: title centre ${m.tcx}`);
      assert.ok(m.tw <= 501, `${c}: title width ${m.tw}`);
      assert.ok(m.inside, `${c}: the arc leaves the polygon`);
      assert.ok(m.tPts, `${c}: the title leaves the polygon`);
    });
  }
});

test('a long name shrinks to fit the badge', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true, '5.2': true });
    await page.goto(url + BADGE('p5'), { waitUntil: 'load' });
    await page.fill('#nome-selo', 'Maria Aparecida de Albuquerque Cavalcanti Figueiredo');
    const w = await page.evaluate(() => document.querySelector('#selo-nome').getBBox().width);
    assert.ok(w <= 521, `name width ${w}`);
  });
});

test('the standalone SVG badges exist for every course and match the generator', async () => {
  const { gerar } = await import('../tools/build-badges.mjs');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(path.join(tmpdir(), 'r2s-selos-'));
  const ids = await gerar(dir);
  assert.deepEqual(ids, ['p1', 'p2', 'p3', 'p4', 'p5', 's1', 's2', 's3', 's4', 's5', 's6']);
  for (const id of ids) {
    const committed = readFileSync(path.join(root, 'academy', 'selos', id + '.svg'), 'utf8');
    assert.equal(committed, readFileSync(path.join(dir, id + '.svg'), 'utf8'), `academy/selos/${id}.svg is out of date: run node tools/build-badges.mjs`);
    assert.match(committed, /viewBox="0 0 1100 750"/);
    assert.match(committed, /SELO DE CONCLUSÃO DE CURSO/);
    assert.ok(!/Concedido a/.test(committed), 'the standalone file carries no name');
  }
});

/* ---------- padrões da skill academy-platform-design ---------- */

test('cards carry a status chip derived from progress, never stored', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '1.1': true, '1.2': true, '5.1': true, '5.2': true });
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await text(page, '#cursos li.curso:nth-child(1) .chip-estado'), '2 / 3');
    assert.equal(await page.locator('#cursos li.curso:nth-child(2) .chip-estado').count(), 0, 'not started has no chip');
    assert.equal(await text(page, '#cursos li.curso:nth-child(5) .chip-estado'), 'Concluído');
    assert.equal(await page.locator('#cursos li.curso .curso-selo').count(), 5);
    const stored = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
    assert.ok(!stored.includes('Concluído') && !stored.includes('2 / 3'), 'the chip is computed, not saved');
  });
});

test('a course can be saved from its card and shows up in the journey', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    const btn = page.locator('#cursos-squad li.curso:nth-child(4) .salvar');
    assert.equal(await btn.getAttribute('aria-label'), 'Salvar Design e o G2');
    await btn.click();
    assert.equal(await btn.getAttribute('aria-pressed'), 'true');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('#cursos-squad li.curso:nth-child(4) .salvar').getAttribute('aria-pressed'), 'true');
    await page.goto(url + 'academy/jornada.html', { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#salvos .linha-titulo'), ['Design e o G2']);
  });
});

test('the Explore menu and the footer expose the same axes', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.equal(await page.locator('#menu-explorar').isVisible(), false);
    await page.click('#explorar');
    assert.equal(await page.getAttribute('#explorar', 'aria-expanded'), 'true');
    const menu = (await page.locator('#menu-explorar .menu-col-titulo').allTextContents()).map((t) => t.trim());
    assert.deepEqual(menu, ['Por tema', 'Por tipo']);
    const footer = await rows(page, '#rodape .rodape-col-titulo');
    assert.deepEqual(footer.slice(0, 2), menu);
    assert.deepEqual(await rows(page, '#menu-explorar .menu-col:first-child a'), await rows(page, '#rodape .rodape-col:first-child a'));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#menu-explorar').isVisible(), false);
  });
});

test('a theme link from the menu filters the catalog', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME + '?tema=lab', { waitUntil: 'load' });
    assert.equal(await page.locator('#cursos-squad li.curso').count(), 6);
    assert.equal(await page.locator('#fluencia').isVisible(), false);
    assert.equal(await page.getAttribute('#temas li.tema:nth-child(4) button', 'aria-pressed'), 'true');
  });
});

test('the home brings the rest of the platform in as lab tools', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    assert.deepEqual(await rows(page, '#ferramentas .curso-titulo'), ['O método em 90 segundos', 'Pre-work interativo', 'Pesquisa de satisfação', 'Certificado', 'Painel da coordenação']);
    const hrefs = await page.locator('#ferramentas a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    assert.deepEqual(hrefs, ['../site/index.html', '../00-prework/index.html', '../05-encerramento/pesquisa.html', '../05-encerramento/certificado.html', '../admin/README.md']);
    for (const h of hrefs) assert.ok(existsSync(path.join(root, 'academy', h)), h);
  });
});

test('the journey dashboard has Continue on the latest course and lists finished ones', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '1.1': true, '2.1': true, '5.1': true, '5.2': true });
    await page.goto(url + LESSON('p2', '2.1'), { waitUntil: 'load' });
    await page.goto(url + 'academy/jornada.html', { waitUntil: 'load' });
    assert.equal(await page.title(), 'Sua jornada · R2S Academy');
    assert.deepEqual(await rows(page, '#andamento .linha-titulo'), ['Do pedido ao problema', 'GenAI na prática'], 'the latest course comes first');
    assert.equal(await page.locator('#continuar').count(), 1);
    assert.match(await page.getAttribute('#continuar', 'href'), /c=p2&l=2\.2$/);
    assert.deepEqual(await rows(page, '#concluidos .linha-titulo'), ['Exercício final']);
    assert.match(await page.getAttribute('#concluidos .btn-sec', 'href'), /selo\.html\?c=p5$/);
    assert.match(await text(page, '#resumo-jornada'), /^1 de 11 cursos concluídos · 2 em andamento$/);
    assert.match(await text(page, '.pagina-jornada'), /Nada salvo ainda/);
  });
});

test('the Avanade re-skin: Segoe UI, light headings and an orange primary button with AA contrast', async () => {
  await withPage({}, async (page, url) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(url + COURSE('p1'), { waitUntil: 'load' });
    const m = await page.evaluate(() => ({
      font: getComputedStyle(document.body).fontFamily, h1: getComputedStyle(document.querySelector('h1')).fontWeight,
      btn: getComputedStyle(document.querySelector('#cta')).backgroundColor, btnFg: getComputedStyle(document.querySelector('#cta')).color,
    }));
    assert.match(m.font, /^"?Segoe UI/);
    assert.equal(m.h1, '300');
    assert.equal(m.btn, 'rgb(220, 70, 0)');
    assert.equal(m.btnFg, 'rgb(255, 255, 255)');
    const css = readFileSync(path.join(root, 'css', 'academy.css'), 'utf8');
    assert.match(css, /--ava-orange:#FF5800/);
    assert.ok(!/Iowan|Palatino|Georgia/.test(css), 'no serif display font left');
  });
});

/* ---------- qualidade ---------- */

const PAGES = [HOME, COURSE('p1'), LESSON('p1', '1.3'), LESSON('p4', '4.2'), BADGE('p5'), BADGE('p4'), COURSE('s4'), LESSON('s1', 's1.1'), LESSON('s1', 's1.2'), 'academy/jornada.html'];

test('no page loads anything external, scrolls sideways at 360 px or throws', async () => {
  for (const p of PAGES) {
    await withPage({ viewport: { width: 360, height: 800 } }, async (page, url) => {
      const external = [];
      page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:')) external.push(r.url()); });
      await page.goto(url + p, { waitUntil: 'load' });
      assert.deepEqual(external, [], p);
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert.ok(sw <= iw, `${p}: ${sw} > ${iw}`);
      assert.deepEqual(page.errors || [], [], p);
    });
  }
  for (const f of ['academy/index.html', 'academy/curso.html', 'academy/licao.html', 'academy/selo.html', 'academy/jornada.html', 'js/academy.js', 'css/academy.css']) {
    const t = readFileSync(path.join(root, f), 'utf8');
    assert.ok(!t.includes('Requirement-to-Solution'), f);
    assert.ok(!/innerHTML\s*=/.test(t), `${f} writes HTML from strings`);
  }
});

test('the controls have a visible focus', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    for (const sel of ['#busca', '#temas li.tema:nth-child(1) button', '#tema-toggle']) {
      await page.focus(sel);
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const w = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
      assert.ok(w > 0, `${sel}: ${w}`);
    }
  });
});

test('the theme toggle switches light and dark and remembers it', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url + HOME, { waitUntil: 'load' });
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('#tema-toggle');
    const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.notEqual(before, after);
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.goto(url + COURSE('p1'), { waitUntil: 'load' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
  });
});

test('reduced motion removes every transition and animation', async () => {
  for (const p of PAGES) {
    await withPage({ reducedMotion: 'reduce' }, async (page, url) => {
      await seed(page, { '5.1': true, '5.2': true });
      await page.goto(url + p, { waitUntil: 'load' });
      const moving = await page.evaluate(() =>
        [...document.querySelectorAll('*')].filter((e) => parseFloat(getComputedStyle(e).transitionDuration) > 0 || getComputedStyle(e).animationName !== 'none').map((e) => e.tagName + '.' + e.className));
      assert.deepEqual(moving, [], p);
    });
  }
});

test('with motion allowed, the earned badge animates and the cards rise in', async () => {
  await withPage({}, async (page, url) => {
    await seed(page, { '5.1': true, '5.2': true });
    await page.goto(url + COURSE('p5'), { waitUntil: 'load' });
    const anim = await page.evaluate(() => [...document.querySelectorAll('.faixa .badge.ganho, .faixa .badge.ganho *')].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none'));
    assert.ok(anim.length > 0, 'the earned badge has an animation');
  });
});
