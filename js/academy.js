/* R2S Academy — catálogo de cursos sobre o pre-work do R2S Lab. Script clássico (abre por file://).
 * Todo texto entra por textContent; o progresso vem do mesmo estado do navegador do pre-work. */
(function () {
  'use strict';

  var P = window.R2SProgress;
  var store = window.R2SStore;

  var TEMAS = [
    { id: 'fundamentos', titulo: 'Fundamentos', texto: 'Como um LLM funciona e como transformar um pedido vago em um problema com métrica.' },
    { id: 'valor', titulo: 'Valor e decisão', texto: 'Quanto vale, quanto custa e quem responde pelo erro antes de pedir uma decisão.' },
    { id: 'case', titulo: 'Case brief', texto: 'Seu caso real, escrito e autoavaliado, pronto para a primeira conversa com o patrocinador.' },
  ];

  var CURSOS = [
    {
      id: 'p1', parte: 1, tema: 'fundamentos', titulo: 'GenAI na prática',
      resumo: 'Como um modelo de linguagem gera texto, o que faz um prompt funcionar e quando usar regra, ML, LLM ou agente.',
      aprender: ['Explicar como um LLM gera texto e onde ele erra', 'Escrever prompts com contexto, formato e exemplos', 'Escolher a técnica mais barata que resolve o caso'],
      quizzes: ['m1_llm', 'm1_prompt', 'm1_tech'],
    },
    {
      id: 'p2', parte: 2, tema: 'fundamentos', titulo: 'Do pedido ao problema',
      resumo: 'Um pedido vago vira um problema com métrica, baseline, meta e escopo, e uma árvore de KPI mostra onde a IA pode atuar.',
      aprender: ['Reconhecer o que falta em um pedido vago', 'Definir métrica, baseline, meta e escopo', 'Montar uma árvore de KPI'],
      quizzes: ['m2_mc', 'm2_class'],
    },
    {
      id: 'p3', parte: 3, tema: 'valor', titulo: 'Valor e custo',
      resumo: 'Os três tipos de valor, o custo de build e de run, e a calculadora que diz se o caso passa no primeiro gate.',
      aprender: ['Separar valor de receita, de custo evitado e de risco', 'Somar custo de build e de run', 'Aplicar a regra do G1: valor maior que 3× o custo de run'],
      quizzes: ['m3_types', 'm3_g1', 'm3_adopt'],
    },
    {
      id: 'p4', parte: 4, tema: 'valor', titulo: 'Responsabilidade e decisão',
      resumo: 'Quem responde quando o algoritmo erra e como montar um pitch de dez minutos que termina em uma decisão.',
      aprender: ['Nomear a pessoa que responde por cada decisão do algoritmo', 'Montar um pitch de 10 minutos que termina em decisão'],
      quizzes: ['m4_rai'],
    },
    {
      id: 'p5', parte: 5, tema: 'case', titulo: 'Exercício final',
      resumo: 'Seu case brief completo e a autoavaliação das oito competências, para chegar ao lab com um caso real.',
      aprender: ['Escrever o case brief do seu caso', 'Medir onde você está em cada competência'],
      quizzes: [],
    },
  ];

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  function duracao(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (!h) return m + ' min';
    return m ? h + ' h ' + m : h + ' h';
  }

  function licoes(c) { return P.PREWORK_BLOCKS.filter(function (b) { return b.part === c.parte; }); }
  function minutos(c) { return licoes(c).reduce(function (a, b) { return a + b.min; }, 0); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  function meta(c) {
    var parts = ['Curso', plural(licoes(c).length, 'lição', 'lições')];
    if (c.quizzes.length) parts.push(plural(c.quizzes.length, 'quiz', 'quizzes'));
    parts.push(duracao(minutos(c)));
    return parts.join(' · ');
  }

  function feitas(c, state) {
    var blocks = state.prework.blocks;
    return licoes(c).filter(function (l) { return blocks[l.id] === true; });
  }
  function concluido(c, state) { return feitas(c, state).length === licoes(c).length; }

  function busca(c) {
    return norm([c.titulo, c.resumo].concat(licoes(c).map(function (l) { return l.title; }), c.aprender).join(' '));
  }

  /* Selo decorativo: o estado "Concluído" também está em texto ao lado. */
  function seloSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('width', '48');
    svg.setAttribute('height', '48');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'selo-svg');
    var ring = document.createElementNS(ns, 'circle');
    ring.setAttribute('cx', '24'); ring.setAttribute('cy', '24'); ring.setAttribute('r', '21');
    ring.setAttribute('class', 'selo-anel');
    var check = document.createElementNS(ns, 'path');
    check.setAttribute('d', 'M15 25l6 6 12-13');
    check.setAttribute('class', 'selo-check');
    svg.appendChild(ring);
    svg.appendChild(check);
    return svg;
  }

  function preencherSelo(node, c) {
    clear(node);
    node.appendChild(seloSvg());
    node.appendChild(el('span', 'selo-titulo', c.titulo));
    node.appendChild(el('span', 'selo-estado', 'Concluído'));
  }

  /* ---------- página inicial ---------- */
  function home() {
    var state = store.load();
    var filtroTema = null;
    var termo = '';

    var temas = $('#temas');
    TEMAS.forEach(function (t) {
      var li = el('li', 'tema');
      var btn = el('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.appendChild(el('b', 'tema-titulo', t.titulo));
      btn.appendChild(el('span', 'tema-texto', t.texto));
      btn.appendChild(el('span', 'tema-n', plural(CURSOS.filter(function (c) { return c.tema === t.id; }).length, 'curso', 'cursos')));
      btn.addEventListener('click', function () {
        filtroTema = filtroTema === t.id ? null : t.id;
        Array.prototype.forEach.call(temas.children, function (item, i) {
          item.firstChild.setAttribute('aria-pressed', TEMAS[i].id === filtroTema ? 'true' : 'false');
        });
        render();
      });
      li.appendChild(btn);
      temas.appendChild(li);
    });

    var lista = $('#cursos');
    function render() {
      clear(lista);
      var q = norm(termo).trim();
      var visiveis = CURSOS.filter(function (c) {
        return (!filtroTema || c.tema === filtroTema) && (!q || busca(c).indexOf(q) !== -1);
      });
      visiveis.forEach(function (c) {
        var li = el('li', 'curso');
        var a = el('a');
        a.href = 'curso.html?c=' + c.id;
        a.appendChild(el('span', 'curso-num', String(c.parte)));
        a.appendChild(el('b', 'curso-titulo', c.titulo));
        a.appendChild(el('span', 'curso-meta', meta(c)));
        a.appendChild(el('span', 'curso-resumo', c.resumo));
        var n = feitas(c, state).length;
        a.appendChild(el('span', 'curso-progresso', n ? n + ' de ' + licoes(c).length + ' lições' : 'Não iniciado'));
        li.appendChild(a);
        lista.appendChild(li);
      });
      $('#sem-resultado').hidden = visiveis.length > 0;
    }
    $('#busca').addEventListener('input', function (e) { termo = e.target.value; render(); });
    render();

    var selos = $('#selos');
    var prontos = CURSOS.filter(function (c) { return concluido(c, state); });
    if (!prontos.length) {
      selos.textContent = 'Você ainda não concluiu nenhum curso. Os selos aparecem aqui.';
      selos.className = 'muted';
    } else {
      var ul = el('ul', 'selos plain');
      prontos.forEach(function (c) {
        var li = el('li', 'selo');
        preencherSelo(li, c);
        ul.appendChild(li);
      });
      selos.appendChild(ul);
    }
  }

  /* ---------- página do curso ---------- */
  function curso() {
    var id = new URLSearchParams(window.location.search).get('c');
    var c = CURSOS.filter(function (x) { return x.id === id; })[0];
    if (!c) { $('#nao-encontrado').hidden = false; return; }
    var state = store.load();
    var feitasIds = feitas(c, state).map(function (l) { return l.id; });
    var lic = licoes(c);

    document.title = c.titulo + ' · R2S Academy';
    $('#titulo').textContent = c.titulo;
    $('#tema').textContent = TEMAS.filter(function (t) { return t.id === c.tema; })[0].titulo;
    $('#meta').textContent = meta(c);
    $('#resumo').textContent = c.resumo;
    c.aprender.forEach(function (t) { $('#aprender').appendChild(el('li', null, t)); });

    lic.forEach(function (l) {
      var ok = feitasIds.indexOf(l.id) !== -1;
      var li = el('li', 'licao' + (ok ? ' feita' : ''));
      li.appendChild(el('span', 'licao-id', l.id));
      li.appendChild(el('span', 'licao-titulo', l.title));
      li.appendChild(el('span', 'licao-min', l.min + ' min'));
      li.appendChild(el('span', 'licao-estado', ok ? 'Concluída' : 'Pendente'));
      $('#licoes').appendChild(li);
    });

    var minFeitos = lic.reduce(function (a, l) { return a + (feitasIds.indexOf(l.id) !== -1 ? l.min : 0); }, 0);
    $('#progresso').textContent = feitasIds.length + ' de ' + lic.length + ' lições · ' + minFeitos + ' de ' + minutos(c) + ' min';

    var cta = $('#cta');
    cta.textContent = feitasIds.length === 0 ? 'Começar' : feitasIds.length === lic.length ? 'Revisar' : 'Continuar';
    cta.href = '../00-prework/index.html#p' + c.parte + 'h';

    if (concluido(c, state)) {
      var selo = $('#selo');
      preencherSelo(selo, c);
      selo.hidden = false;
    }
    $('#curso').hidden = false;
  }

  if ($('#cursos')) home();
  else curso();
})();
