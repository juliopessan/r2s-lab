/* R2S Academy — catálogo, página do curso e página da lição, no modelo da Claude Academy.
 * Script clássico (abre por file://). O conteúdo das lições vem de js/academy-content.js, gerado a partir
 * do pre-work; o progresso é o mesmo estado do navegador que o pre-work usa. Todo texto entra por textContent. */
(function () {
  'use strict';

  var P = window.R2SProgress;
  var store = window.R2SStore;
  var C = window.R2S_ACADEMY;
  var SQ = window.R2S_ACADEMY_SQUAD || { courses: [], lessons: {} };
  var THEME_KEY = 'r2s-academy-theme';
  var UI_KEY = 'r2s-academy-ui-v1';
  var SVG = 'http://www.w3.org/2000/svg';

  /* ---------- armazenamento local da interface (nunca entra no arquivo exportado) ---------- */
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* segue sem lembrar */ } }
  function ui() { try { return JSON.parse(lsGet(UI_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function setUi(patch) { var u = ui(); Object.keys(patch).forEach(function (k) { u[k] = patch[k]; }); lsSet(UI_KEY, JSON.stringify(u)); }

  /* ---------- tema ---------- */
  var root = document.documentElement;
  var savedTheme = lsGet(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  function effectiveTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  /* ---------- catálogo ---------- */
  var TEMAS = [
    { id: 'fundamentos', titulo: 'Fundamentos', texto: 'Como um LLM funciona e como transformar um pedido vago em um problema com métrica.' },
    { id: 'valor', titulo: 'Valor e decisão', texto: 'Quanto vale, quanto custa e quem responde pelo erro antes de pedir uma decisão.' },
    { id: 'case', titulo: 'Case brief', texto: 'Seu caso real, escrito e autoavaliado, pronto para a primeira conversa com o patrocinador.' },
    { id: 'lab', titulo: 'Lab Loop da squad', texto: 'As 7 etapas e os 5 gates da squad, do case brief à decisão do negócio.' },
  ];

  var CURSOS = [
    {
      id: 'p1', parte: 1, tema: 'fundamentos',
      resumo: 'Como um modelo de linguagem gera texto, o que faz um prompt funcionar e quando usar regra, ML, LLM ou agente.',
      aprender: ['Explicar como um LLM gera texto e onde ele erra', 'Escrever prompts com contexto, formato e exemplos', 'Escolher a técnica mais barata que resolve o caso'],
      publico: 'Quem vai entrar no R2S Lab e ainda usa GenAI só como chat.',
      antes: ['Nenhum: este é o primeiro curso', 'Acesso a uma ferramenta de GenAI aprovada'],
    },
    {
      id: 'p2', parte: 2, tema: 'fundamentos',
      resumo: 'Um pedido vago vira um problema com métrica, baseline, meta e escopo, e uma árvore de KPI mostra onde a IA pode atuar.',
      aprender: ['Reconhecer o que falta em um pedido vago', 'Definir métrica, baseline, meta e escopo', 'Montar uma árvore de KPI'],
      publico: 'Quem recebe pedidos do tipo "dá para fazer com IA?" e precisa transformá-los em um problema.',
      antes: ['GenAI na prática'],
    },
    {
      id: 'p3', parte: 3, tema: 'valor',
      resumo: 'Os três tipos de valor, o custo de build e de run, e a calculadora que diz se o caso passa no primeiro gate.',
      aprender: ['Separar valor de receita, de custo evitado e de risco', 'Somar custo de build e de run', 'Aplicar a regra do G1: valor maior que 3× o custo de run'],
      publico: 'Quem precisa dizer, com número e premissa, se um caso vale o que custa.',
      antes: ['Do pedido ao problema'],
    },
    {
      id: 'p4', parte: 4, tema: 'valor',
      resumo: 'Quem responde quando o algoritmo erra e como montar um pitch de dez minutos que termina em uma decisão.',
      aprender: ['Nomear a pessoa que responde por cada decisão do algoritmo', 'Montar um pitch de 10 minutos que termina em decisão'],
      publico: 'Quem vai apresentar um caso ao patrocinador e precisa sair da sala com uma decisão.',
      antes: ['Valor e custo'],
    },
    {
      id: 'p5', parte: 5, tema: 'case',
      resumo: 'Seu case brief completo e a autoavaliação das oito competências, para chegar ao lab com um caso real.',
      aprender: ['Escrever o case brief do seu caso', 'Medir onde você está em cada competência'],
      publico: 'Quem terminou os quatro cursos e vai levar um caso real para a squad.',
      antes: ['Os quatro cursos anteriores', 'Um caso real da sua área, sem dado de cliente'],
    },
  ];
  CURSOS.forEach(function (c) {
    var part = C.parts.filter(function (p) { return p.part === c.parte; })[0];
    c.titulo = part.title;
    c.objetivo = part.goal;
    c.seed = c.parte;
    c.fonte = 'prework';
    c.quizzes = licoes(c).reduce(function (a, l) { return a.concat(conteudo(l.id).quizzes); }, []);
  });
  SQ.courses.forEach(function (s, i) {
    CURSOS.push({
      id: s.id, parte: i + 1, seed: 20 + i, tema: 'lab', fonte: 'squad', titulo: s.titulo, resumo: s.resumo, objetivo: s.objetivo,
      aprender: s.aprender, publico: s.publico, antes: s.antes, ids: s.lessons, quizzes: [],
    });
  });

  /* ---------- utilidades ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function duracao(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (!h) return m + ' min';
    return m ? h + ' h ' + m : h + ' h';
  }
  function param(name) { return new URLSearchParams(window.location.search).get(name); }

  function licoes(c) {
    if (c.fonte === 'squad') return c.ids.map(function (id) { return { id: id, title: SQ.lessons[id].title, min: SQ.lessons[id].min }; });
    return P.PREWORK_BLOCKS.filter(function (b) { return b.part === c.parte; });
  }
  function conteudo(id) {
    var x = C.lessons[id] || SQ.lessons[id];
    if (!x.quizzes) x.quizzes = [];
    if (!x.refs) x.refs = [];
    return x;
  }
  /* Pre-work: o estado exportável (prework.blocks). Jornada da squad: só neste navegador, porque o progresso
   * real da squad é o gates.json do repositório dela. */
  function feito(c, id, state) {
    if (c.fonte === 'squad') return academia(state).lidas.indexOf(id) !== -1;
    return state.prework.blocks[id] === true;
  }
  /* A seção academy do progresso exportável (lições da squad e selos com data). */
  function academia(state) { return state.academy || { lidas: [], selos: {} }; }
  /** Altera só a seção academy, relendo o estado para não apagar o que outra aba salvou. */
  function alterarAcademia(fn) {
    var fresh = store.load();
    var a = academia(fresh);
    a = { lidas: a.lidas.slice(), selos: Object.assign({}, a.selos) };
    fn(a);
    fresh.academy = a;
    fresh.updatedAt = new Date().toISOString();
    store.save(fresh);
    return fresh;
  }
  /** Garante a data de emissão de cada selo ganho (e migra o que versões anteriores guardavam na interface). */
  function sincronizarSelos() {
    var antigo = ui();
    var state = store.load();
    var a = academia(state);
    var faltam = CURSOS.filter(function (c) { return concluido(c, state) && !a.selos[c.id]; });
    var lidasAntigas = Object.keys(antigo.lidas || {}).filter(function (id) { return a.lidas.indexOf(id) === -1; });
    if (!faltam.length && !lidasAntigas.length) return state;
    var datasAntigas = antigo.concluidoEm || {};
    state = alterarAcademia(function (x) {
      lidasAntigas.forEach(function (id) { x.lidas.push(id); });
    });
    state = alterarAcademia(function (x) {
      CURSOS.forEach(function (c) { if (concluido(c, state) && !x.selos[c.id]) x.selos[c.id] = datasAntigas[c.id] || hoje(); });
    });
    setUi({ lidas: null, concluidoEm: null });
    return state;
  }
  function minutos(c) { return licoes(c).reduce(function (a, b) { return a + b.min; }, 0); }
  function cursoPorId(id) { return CURSOS.filter(function (c) { return c.id === id; })[0]; }
  function feitas(c, state) { return licoes(c).filter(function (l) { return feito(c, l.id, state); }); }
  function concluido(c, state) { return feitas(c, state).length === licoes(c).length; }

  /* Estado do aprendiz, sempre derivado do progresso (nunca guardado): nenhum > n / N > Concluído. */
  function estado(c, state) {
    var n = feitas(c, state).length;
    var total = licoes(c).length;
    return { tipo: n === 0 ? 'nenhum' : n === total ? 'concluido' : 'andamento', n: n, total: total };
  }
  function chipEstado(c, state) {
    var e = estado(c, state);
    if (e.tipo === 'nenhum') return null;
    var chip = el('span', 'chip-estado ' + e.tipo);
    if (e.tipo === 'concluido') { chip.textContent = 'Concluído'; return chip; }
    chip.appendChild(el('span', null, e.n + ' / ' + e.total));
    var barra = el('span', 'mini-barra');
    barra.setAttribute('aria-hidden', 'true');
    var fill = el('i');
    fill.style.width = Math.round((100 * e.n) / e.total) + '%';
    barra.appendChild(fill);
    chip.appendChild(barra);
    return chip;
  }
  function salvos() { return ui().salvos || {}; }
  function botaoSalvar(c) {
    var b = el('button', 'salvar icon-btn');
    b.type = 'button';
    var on = salvos()[c.id] === true;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', (on ? 'Remover dos salvos: ' : 'Salvar ') + c.titulo);
    var svg = svgEl('svg', { viewBox: '0 0 24 24', width: '18', height: '18', 'aria-hidden': 'true' });
    svg.appendChild(svgEl('path', { d: 'M6 3h12v18l-6-4-6 4z' }));
    b.appendChild(svg);
    b.addEventListener('click', function () {
      var atual = salvos();
      if (atual[c.id]) delete atual[c.id]; else atual[c.id] = true;
      setUi({ salvos: atual });
      var agora = atual[c.id] === true;
      b.setAttribute('aria-pressed', agora ? 'true' : 'false');
      b.setAttribute('aria-label', (agora ? 'Remover dos salvos: ' : 'Salvar ') + c.titulo);
    });
    return b;
  }

  /* O caminho do lab, na ordem do fluxo: pre-work, jornada da squad, pesquisa, certificado e painel.
   * O estado de cada passo é derivado do progresso, como os chips dos cursos. */
  var CAMINHO = [
    { id: 'prework', titulo: 'Pre-work', texto: 'Oito horas em cinco partes, com quizzes, calculadoras e exportação do progresso. São os cinco primeiros cursos do catálogo.', href: '../00-prework/index.html' },
    { id: 'squad', titulo: 'Jornada da squad', texto: 'Seis cursos, um por etapa do Lab Loop, do case brief à decisão do negócio no G4.', href: 'index.html#jornada-titulo' },
    { id: 'pesquisa', titulo: 'Pesquisa de satisfação', texto: 'NPS, notas, perguntas abertas e consentimento, no mesmo arquivo do progresso.', href: '../05-encerramento/pesquisa.html' },
    { id: 'certificado', titulo: 'Certificado', texto: 'Emitido pela coordenação, em A4 paisagem, com o nível Foundation, Practitioner ou Lead.', href: '../05-encerramento/certificado.html' },
    { id: 'painel', titulo: 'Painel da coordenação', texto: 'Treinados e faltantes, satisfação, feedbacks, squads, certificação, scorecard e a Academy. Ele lê o arquivo que você registra em Sua jornada.', href: '../admin/README.md' },
  ];
  function estadoPasso(id, state) {
    if (id === 'prework') {
      var min = P.preworkMinutes(state);
      if (min >= P.TOTAL_MIN) return { texto: 'Concluído', feito: true };
      return { texto: min ? duracao(min) + ' de 8 h' : 'Não iniciado', feito: false };
    }
    if (id === 'squad') {
      var squad = CURSOS.filter(function (c) { return c.fonte === 'squad'; });
      var n = squad.filter(function (c) { return concluido(c, state); }).length;
      return { texto: n === squad.length ? 'Concluído' : n + ' de ' + squad.length + ' selos', feito: n === squad.length };
    }
    if (id === 'pesquisa') return state.survey ? { texto: 'Respondida', feito: true } : { texto: 'Pendente', feito: false };
    if (id === 'certificado') return { texto: 'Emitido pela coordenação', feito: false };
    return { texto: 'Para a coordenação', feito: false };
  }
  function prework(c) { return '../00-prework/index.html#p' + c.parte + 'h'; }

  function meta(c) {
    var parts = ['Curso', plural(licoes(c).length, 'lição', 'lições')];
    if (c.quizzes.length) parts.push(plural(c.quizzes.length, 'quiz', 'quizzes'));
    parts.push(duracao(minutos(c)));
    return parts.join(' · ');
  }
  function busca(c) {
    return norm([c.titulo, c.resumo].concat(licoes(c).map(function (l) { return l.title; }), c.aprender).join(' '));
  }
  function pilulas(node, itens) {
    clear(node);
    itens.forEach(function (t) { node.appendChild(el('span', 'pilula', t)); node.appendChild(document.createTextNode(' ')); });
  }
  function migalhas(node, itens) {
    clear(node);
    itens.forEach(function (it, i) {
      if (i) node.appendChild(document.createTextNode(' / '));
      if (it.href) { var a = el('a', null, it.texto); a.href = it.href; node.appendChild(a); }
      else node.appendChild(el('span', null, it.texto));
    });
  }

  /* ---------- selo (badge): arte em lib/badge-art.js ---------- */
  var ART = window.R2SBadgeArt;
  var MATERIA = ART.MATERIA;
  var dataLonga = ART.dataLonga;
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** Selo pequeno: ganho (colorido, com brilho) ou bloqueado (apagado). Decorativo: o estado vai em texto ao lado. */
  function badge(c, ganho, tamanho) {
    var wrap = el('span', 'badge t-' + c.id + (ganho ? ' ganho' : ' bloqueado'));
    wrap.style.setProperty('--tam', (tamanho || 48) + 'px');
    wrap.appendChild(ART.miniatura(document, c));
    wrap.appendChild(el('span', 'badge-brilho'));
    return wrap;
  }
  /** Ficha no formato da página de selos da Claude Academy: polígono pastel com ícone e nome do curso. */
  function fichaEl(c, opcoes) {
    opcoes = opcoes || {};
    var wrap = el('span', 'badge ficha-badge t-' + c.id + (opcoes.ganho ? ' ganho' : '') + (opcoes.bloqueado ? ' bloqueada' : ''));
    wrap.style.setProperty('--tam', (opcoes.tamanho || 180) + 'px');
    wrap.appendChild(ART.ficha(document, c, { bloqueado: opcoes.bloqueado === true }));
    return wrap;
  }
  function seloCompleto(c, nome, dataIso) { return ART.completo(document, c, nome, dataIso); }
  function alinharTudo() { ART.alinhar(document); }

  /* ---------- cabeçalho e rodapé ---------- */
  function trocarTema() {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    lsSet(THEME_KEY, next);
  }
  /* Os mesmos eixos no menu Explorar e no rodapé: tema e tipo. */
  function eixos() {
    return [
      { titulo: 'Por tema', links: TEMAS.map(function (t) { return [t.titulo, 'index.html?tema=' + t.id]; }) },
      { titulo: 'Por tipo', links: [
        ['Cursos do pre-work', 'index.html#cursos-titulo'], ['Jornada da squad', 'index.html#jornada-titulo'],
        ['O caminho do lab', 'index.html#caminho-titulo'], ['Selos', 'index.html#selos-titulo'],
      ] },
    ];
  }
  function coluna(titulo, links, cls) {
    var col = el('div', cls);
    col.appendChild(el('h2', cls + '-titulo', titulo));
    var ul = el('ul', 'plain');
    links.forEach(function (l) { var li = el('li'); var a = el('a', null, l[0]); a.href = l[1]; li.appendChild(a); ul.appendChild(li); });
    col.appendChild(ul);
    return col;
  }
  function chrome() {
    var toggle = $('#tema-toggle');
    if (toggle) toggle.addEventListener('click', trocarTema);

    var botao = $('#explorar');
    var menu = $('#menu-explorar');
    if (botao && menu) {
      eixos().forEach(function (e) { menu.appendChild(coluna(e.titulo, e.links, 'menu-col')); });
      var fechar = function () { botao.setAttribute('aria-expanded', 'false'); menu.hidden = true; };
      botao.addEventListener('click', function () {
        var aberto = botao.getAttribute('aria-expanded') === 'true';
        botao.setAttribute('aria-expanded', aberto ? 'false' : 'true');
        menu.hidden = aberto;
        if (!aberto) { var primeiro = $('a', menu); if (primeiro) primeiro.focus(); }
      });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !menu.hidden) { fechar(); botao.focus(); } });
      document.addEventListener('click', function (ev) { if (!menu.hidden && !menu.contains(ev.target) && ev.target !== botao && !botao.contains(ev.target)) fechar(); });
    }

    var rodape = $('#rodape');
    if (!rodape) return;
    var inner = el('div', 'rodape-in');
    eixos().forEach(function (e) { inner.appendChild(coluna(e.titulo, e.links, 'rodape-col')); });
    inner.appendChild(coluna('O caminho do lab', CAMINHO.map(function (f, i) { return [(i + 1) + '. ' + f.titulo, f.href]; }), 'rodape-col'));
    var pref = el('div', 'rodape-col');
    pref.appendChild(el('h2', 'rodape-col-titulo', 'Preferências'));
    var tb = el('button', 'rodape-tema', 'Alternar tema claro e escuro');
    tb.type = 'button';
    tb.id = 'tema-toggle-rodape';
    tb.addEventListener('click', trocarTema);
    pref.appendChild(tb);
    pref.appendChild(el('p', null, 'Idioma: português (Brasil)'));
    inner.appendChild(pref);
    var base = el('div', 'rodape-base');
    base.appendChild(el('p', null, 'R2S Lab · Avanade Brazil Engineering HUB'));
    base.appendChild(el('p', null, 'Seu progresso fica neste navegador.'));
    rodape.appendChild(inner);
    rodape.appendChild(base);
  }

  /* ---------- página inicial ---------- */
  function home() {
    var state = store.load();
    var filtroTema = null;
    var termo = '';

    var temas = $('#temas');
    TEMAS.forEach(function (t, i) {
      var li = el('li', 'tema rise');
      li.style.setProperty('--d', (80 + i * 60) + 'ms');
      var btn = el('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.appendChild(el('b', 'tema-titulo', t.titulo));
      btn.appendChild(el('span', 'tema-texto', t.texto));
      btn.appendChild(el('span', 'tema-n', plural(CURSOS.filter(function (c) { return c.tema === t.id; }).length, 'curso', 'cursos')));
      btn.addEventListener('click', function () {
        filtroTema = filtroTema === t.id ? null : t.id;
        Array.prototype.forEach.call(temas.children, function (item, j) {
          item.firstChild.setAttribute('aria-pressed', TEMAS[j].id === filtroTema ? 'true' : 'false');
        });
        render(false);
      });
      li.appendChild(btn);
      temas.appendChild(li);
    });

    var lista = $('#cursos');
    var listaSquad = $('#cursos-squad');
    function render(primeira) {
      clear(lista);
      clear(listaSquad);
      var q = norm(termo).trim();
      var visiveis = CURSOS.filter(function (c) {
        return (!filtroTema || c.tema === filtroTema) && (!q || busca(c).indexOf(q) !== -1);
      });
      visiveis.forEach(function (c, i) {
        var li = el('li', 'curso t-' + c.id + (primeira ? ' cair' : ''));
        li.style.setProperty('--d', (i * 70) + 'ms');
        li.style.setProperty('--r', ((i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4)) + 'deg');
        var a = el('a');
        a.href = 'curso.html?c=' + c.id;
        var capa = el('span', 'curso-capa');
        capa.appendChild(fichaEl(c, { ganho: concluido(c, state), tamanho: 176 }));
        var chip = chipEstado(c, state);
        if (chip) capa.appendChild(chip);
        a.appendChild(capa);
        var corpo = el('span', 'curso-corpo');
        corpo.appendChild(el('b', 'curso-titulo', c.titulo));
        corpo.appendChild(el('span', 'curso-meta', meta(c)));
        corpo.appendChild(el('span', 'curso-resumo', c.resumo));
        var n = feitas(c, state).length;
        corpo.appendChild(el('span', 'curso-progresso', n ? n + ' de ' + licoes(c).length + ' lições' : 'Não iniciado'));
        corpo.appendChild(el('span', 'curso-selo', 'Selo de conclusão'));
        a.appendChild(corpo);
        li.appendChild(a);
        li.appendChild(botaoSalvar(c));
        (c.fonte === 'squad' ? listaSquad : lista).appendChild(li);
      });
      $('#sem-resultado').hidden = visiveis.length > 0;
      $('#jornada').hidden = !visiveis.some(function (c) { return c.fonte === 'squad'; });
      $('#fluencia').hidden = !visiveis.some(function (c) { return c.fonte !== 'squad'; });
      alinharTudo();
    }
    $('#busca').addEventListener('input', function (e) { termo = e.target.value; render(false); });
    var temaUrl = param('tema');
    if (TEMAS.some(function (t) { return t.id === temaUrl; })) {
      filtroTema = temaUrl;
      Array.prototype.forEach.call(temas.children, function (item, j) { item.firstChild.setAttribute('aria-pressed', TEMAS[j].id === filtroTema ? 'true' : 'false'); });
    }
    render(true);

    var caminho = $('#caminho');
    CAMINHO.forEach(function (f, i) {
      var e = estadoPasso(f.id, state);
      var li = el('li', 'passo' + (e.feito ? ' feito' : ''));
      var a = el('a');
      a.href = f.href;
      a.appendChild(el('span', 'passo-num', String(i + 1)));
      var corpo = el('span', 'passo-corpo');
      corpo.appendChild(el('b', 'passo-titulo', f.titulo));
      corpo.appendChild(el('span', 'passo-texto', f.texto));
      a.appendChild(corpo);
      a.appendChild(el('span', 'passo-estado', e.texto));
      li.appendChild(a);
      caminho.appendChild(li);
    });

    var ganhos = CURSOS.filter(function (c) { return concluido(c, state); }).length;
    $('#selos-resumo').textContent = ganhos
      ? ganhos + ' de ' + CURSOS.length + ' selos.'
      : '0 de ' + CURSOS.length + ' selos. Conclua um curso para ganhar o primeiro.';
    var selos = $('#selos');
    CURSOS.forEach(function (c) {
      var ok = concluido(c, state);
      var li = el('li', 'selo' + (ok ? ' ganho' : ''));
      var a = el('a', 'selo-link');
      a.href = ok ? 'selo.html?c=' + c.id : 'curso.html?c=' + c.id;
      a.appendChild(fichaEl(c, { ganho: ok, bloqueado: !ok, tamanho: 200 }));
      a.appendChild(el('span', 'selo-titulo sr', c.titulo));
      li.appendChild(a);
      var falta = licoes(c).length - feitas(c, state).length;
      var datasSelos = academia(state).selos;
      li.appendChild(el('p', 'selo-legenda', ok
        ? 'Emitido em ' + dataLonga(datasSelos[c.id] || hoje())
        : (falta === 1 ? 'Falta 1 lição' : 'Faltam ' + falta + ' lições')));
      li.appendChild(el('span', 'selo-estado sr', ok ? 'Concluído' : 'Bloqueado'));
      selos.appendChild(li);
    });
    alinharTudo();
  }

  /* ---------- página do curso ---------- */
  function curso() {
    var c = cursoPorId(param('c'));
    if (!c) { $('#nao-encontrado').hidden = false; return; }
    var state = store.load();
    var lic = licoes(c);
    var feitasIds = feitas(c, state).map(function (l) { return l.id; });
    var completo = feitasIds.length === lic.length;

    document.title = c.titulo + ' · R2S Academy';
    $('.faixa').classList.add('t-' + c.id);
    migalhas($('#migalhas'), [{ texto: 'Academy', href: 'index.html' }, { texto: 'Cursos', href: 'index.html#cursos-titulo' }]);
    $('#titulo').textContent = c.titulo;
    $('#resumo').textContent = c.resumo;
    var pills = [plural(lic.length, 'lição', 'lições'), duracao(minutos(c))];
    if (c.quizzes.length) pills.push(plural(c.quizzes.length, 'quiz', 'quizzes'));
    pills.push('Selo de conclusão');
    pilulas($('#meta'), pills);
    $('#faixa-arte').appendChild(fichaEl(c, { ganho: completo, tamanho: 230 }));
    var chipCurso = chipEstado(c, state);
    if (chipCurso) $('#meta').appendChild(chipCurso);
    $('.acoes').appendChild(botaoSalvar(c));

    var pendente = lic.filter(function (l) { return feitasIds.indexOf(l.id) === -1; })[0];
    var cta = $('#cta');
    cta.textContent = feitasIds.length === 0 ? 'Começar curso' : completo ? 'Revisar' : 'Continuar';
    cta.href = 'licao.html?c=' + c.id + '&l=' + (pendente || lic[0]).id;
    var minFeitos = lic.reduce(function (a, l) { return a + (feitasIds.indexOf(l.id) !== -1 ? l.min : 0); }, 0);
    $('#progresso').textContent = feitasIds.length + ' de ' + lic.length + ' lições · ' + minFeitos + ' de ' + minutos(c) + ' min';
    $('#barra').style.width = Math.round((100 * minFeitos) / minutos(c)) + '%';

    c.aprender.forEach(function (t) { $('#aprender').appendChild(el('li', null, t)); });
    $('#publico').textContent = c.publico;
    c.antes.forEach(function (t) { $('#antes').appendChild(el('li', null, t)); });
    $('#intro').textContent = c.objetivo;

    lic.forEach(function (l, i) {
      var ok = feitasIds.indexOf(l.id) !== -1;
      var li = el('li', 'licao rise' + (ok ? ' feita' : ''));
      li.style.setProperty('--d', (i * 50) + 'ms');
      var a = el('a');
      a.href = 'licao.html?c=' + c.id + '&l=' + l.id;
      a.appendChild(el('span', 'licao-id', l.id));
      a.appendChild(el('span', 'licao-titulo', l.title));
      a.appendChild(el('span', 'licao-min', l.min + ' min'));
      a.appendChild(el('span', 'licao-estado', ok ? 'Concluída' : 'Pendente'));
      li.appendChild(a);
      $('#licoes').appendChild(li);

      var oli = el('li', ok ? 'feita' : null);
      var oa = el('a', null, l.title);
      oa.href = a.href;
      oli.appendChild(oa);
      if (conteudo(l.id).quizzes.length) { oli.appendChild(document.createTextNode(' ')); oli.appendChild(el('span', 'chip', 'Quiz')); }
      $('#outline').appendChild(oli);
    });
    var fim = el('li', 'outline-selo' + (completo ? ' feita' : ''));
    fim.appendChild(badge(c, completo, 20));
    var verSelo = el('a', null, 'Selo de conclusão');
    verSelo.href = 'selo.html?c=' + c.id;
    fim.appendChild(verSelo);
    $('#outline').appendChild(fim);

    if (completo) {
      var selo = $('#selo');
      selo.appendChild(badge(c, true, 72));
      var t = el('div');
      t.appendChild(el('b', 'selo-titulo', c.titulo));
      t.appendChild(el('span', 'selo-estado', 'Concluído'));
      t.appendChild(el('p', 'muted', 'Você concluiu todas as lições deste curso.'));
      var link = el('a', 'btn-sec', 'Ver seu selo');
      link.href = 'selo.html?c=' + c.id;
      t.appendChild(link);
      selo.appendChild(t);
      selo.hidden = false;
    }
    $('#curso').hidden = false;
    alinharTudo();
  }

  /* ---------- página da lição ---------- */
  function renderCorpo(item) {
    if (item.type === 'p') return el('p', null, item.text);
    if (item.type === 'table') {
      var tw = el('div', 'tw');
      var table = el('table', 'mini');
      var tbody = el('tbody');
      item.rows.forEach(function (r) {
        var tr = el('tr');
        var th = el('th', null, r[0]);
        th.scope = 'row';
        tr.appendChild(th);
        tr.appendChild(el('td', null, r[1]));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tw.appendChild(table);
      return tw;
    }
    if (item.type === 'ladder') {
      var ul = el('ul', 'escada plain');
      ul.setAttribute('aria-label', 'Escada de custo, da técnica mais barata para a mais cara');
      item.items.forEach(function (s) {
        var li = el('li');
        li.appendChild(el('span', 'escada-nome', s.label));
        li.appendChild(document.createTextNode(' '));
        li.appendChild(el('span', 'escada-custo', s.cost));
        ul.appendChild(li);
      });
      return ul;
    }
    if (item.type === 'tree') {
      var arvore = function (itens) {
        var lista = el('ul');
        itens.forEach(function (n) {
          var li = el('li', n.ai ? 'ia' : null, n.text);
          if (n.ai) { li.appendChild(document.createTextNode(' ')); li.appendChild(el('span', 'ia-nota', 'IA pode atuar aqui')); }
          if (n.children.length) li.appendChild(arvore(n.children));
          lista.appendChild(li);
        });
        return lista;
      };
      var fig = el('div', 'arvore');
      fig.appendChild(arvore(item.items));
      return fig;
    }
    if (item.type === 'pitch') {
      var ol = el('ol', 'pitch plain');
      ol.setAttribute('aria-label', item.label);
      item.items.forEach(function (s) {
        var li = el('li', s.demo ? 'demo' : null);
        li.style.flexGrow = String(s.min);
        li.appendChild(el('b', null, s.time));
        li.appendChild(el('span', null, s.text));
        ol.appendChild(li);
      });
      return ol;
    }
    if (item.type === 'steps') {
      var etapas = el('ol', 'etapas plain');
      etapas.setAttribute('aria-label', 'As 7 etapas do Lab Loop e os gates');
      item.items.forEach(function (e) {
        var li = el('li', e.gate ? 'com-gate' : null);
        li.appendChild(el('span', 'etapa-nome', e.label));
        if (e.gate) { li.appendChild(document.createTextNode(' ')); li.appendChild(el('span', 'etapa-gate', e.gate)); }
        etapas.appendChild(li);
      });
      return etapas;
    }
    if (item.type === 'template') {
      var doc = C.templates[item.doc];
      var box = el('div', 'modelo');
      box.appendChild(el('p', 'modelo-cabeca', 'Modelo ' + item.doc + ' · ' + doc.title + (doc.when ? ' (' + doc.when + ')' : '')));
      doc.sections.filter(function (sec) { return !item.sections || item.sections.indexOf(sec.heading) !== -1; }).forEach(function (sec) {
        box.appendChild(el('h3', 'modelo-secao', sec.heading));
        var ul = el('ul', 'modelo-campos');
        sec.fields.forEach(function (f) {
          var li = el('li', null, f.label);
          if (f.optional) { li.appendChild(document.createTextNode(' ')); li.appendChild(el('span', 'chip', 'opcional')); }
          ul.appendChild(li);
        });
        box.appendChild(ul);
      });
      return box;
    }
    return el('p', null, '');
  }

  function licao() {
    var c = cursoPorId(param('c'));
    var id = param('l');
    var lic = c ? licoes(c) : [];
    var idx = -1;
    lic.forEach(function (l, i) { if (l.id === id) idx = i; });
    if (!c || idx === -1) { $('#nao-encontrado').hidden = false; return; }
    var l = lic[idx];
    var dados = conteudo(l.id);

    document.title = l.title + ' · R2S Academy';
    setUi({ ultima: { c: c.id, l: l.id, em: Date.now() } });
    migalhas($('#migalhas'), [
      { texto: 'Academy', href: 'index.html' },
      { texto: 'Cursos', href: 'index.html#cursos-titulo' },
      { texto: c.titulo, href: 'curso.html?c=' + c.id },
    ]);
    $('#titulo').textContent = l.title;
    pilulas($('#meta'), ['Lição ' + (idx + 1), l.min + ' min']);

    /* aviso de progresso */
    var aviso = $('#aviso-progresso');
    if (c.fonte === 'squad') {
      $('.aviso-titulo', aviso).textContent = 'O que você lê aqui fica neste navegador';
      $('p.muted', aviso).textContent = 'O progresso real da squad é o gates.json do repositório dela, aprovado por pull request.';
    }
    if (ui().avisoFechado) aviso.hidden = true;
    $('button', aviso).addEventListener('click', function () { aviso.hidden = true; setUi({ avisoFechado: true }); });

    /* conteúdo em seções, com o sumário ao lado */
    var corpo = $('#conteudo-licao');
    var secoes = [];
    function secao(idSec, titulo) {
      var s = el('section', 'secao');
      s.id = idSec;
      s.appendChild(el('h2', null, titulo));
      corpo.appendChild(s);
      secoes.push({ id: idSec, titulo: titulo, node: s });
      return s;
    }
    var ideia = secao('sec-ideia', 'Ideia central');
    dados.body.forEach(function (item) { ideia.appendChild(renderCorpo(item)); });

    if (dados.exercise || dados.tool || dados.quizzes.length || dados.arquivo) {
      var pratica = secao('sec-pratica', 'Na prática');
      if (dados.exercise) {
        var fazer = el('div', 'fazer');
        fazer.appendChild(el('b', null, dados.exercise.label));
        fazer.appendChild(el('p', null, dados.exercise.text));
        pratica.appendChild(fazer);
      }
      if (dados.arquivo) {
        var repo = el('div', 'pratica');
        repo.appendChild(el('p', null, 'Este passo acontece no repositório da squad. Depois, rode node tools/check-squad.mjs para conferir.'));
        var abrirArq = el('a', 'btn-sec', 'Abrir ' + dados.arquivo.titulo);
        abrirArq.href = dados.arquivo.href;
        repo.appendChild(abrirArq);
        pratica.appendChild(repo);
      }
      if (dados.tool || dados.quizzes.length) {
        var box = el('div', 'pratica');
        var o = [];
        if (dados.tool) o.push('uma ferramenta interativa');
        if (dados.quizzes.length) o.push(dados.quizzes.length === 1 ? 'um quiz' : dados.quizzes.length + ' quizzes');
        box.appendChild(el('p', null, 'Esta lição tem ' + o.join(' e ') + ' no pre-work. O que você fizer lá conta no seu progresso.'));
        var link = el('a', 'btn-sec', 'Abrir no pre-work');
        link.href = prework(c);
        box.appendChild(link);
        pratica.appendChild(box);
      }
    }

    if (dados.refs.length) {
      var alem = secao('sec-alem', 'Para ir além');
      var ul = el('ul', 'refs plain');
      dados.refs.forEach(function (r) {
        var li = el('li');
        var a = el('a', null, r.title);
        a.href = r.url;
        a.target = '_blank';
        a.rel = 'noopener';
        li.appendChild(a);
        if (r.note) li.appendChild(el('small', null, r.note));
        ul.appendChild(li);
      });
      alem.appendChild(ul);
    }

    var sumario = $('#sumario ol');
    secoes.forEach(function (s) {
      var li = el('li');
      var a = el('a', null, s.titulo);
      a.href = '#' + s.id;
      li.appendChild(a);
      sumario.appendChild(li);
      s.link = a;
    });
    function ativar(idSec) {
      secoes.forEach(function (s) {
        var on = s.id === idSec;
        s.link.classList.toggle('ativo', on);
        if (on) s.link.setAttribute('aria-current', 'true'); else s.link.removeAttribute('aria-current');
      });
    }
    ativar(secoes[0].id);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        var visiveis = entries.filter(function (e) { return e.isIntersecting; });
        if (visiveis.length) ativar(visiveis[0].target.id);
      }, { rootMargin: '-20% 0px -65% 0px' });
      secoes.forEach(function (s) { io.observe(s.node); });
    }

    /* posição no curso, com a lista das lições */
    $('#posicao .posicao-onde').textContent = 'Lição ' + (idx + 1) + ' de ' + lic.length + ' · ' + c.titulo;
    $('#posicao .posicao-titulo').textContent = l.title;
    var lista = $('#posicao-lista');
    lic.forEach(function (x) {
      var li = el('li', x.id === l.id ? 'atual' : null);
      var a = el('a', null, x.title);
      a.href = 'licao.html?c=' + c.id + '&l=' + x.id;
      if (x.id === l.id) a.setAttribute('aria-current', 'page');
      li.appendChild(a);
      lista.appendChild(li);
    });
    var abrir = $('#posicao button');
    abrir.addEventListener('click', function () {
      var aberto = abrir.getAttribute('aria-expanded') === 'true';
      abrir.setAttribute('aria-expanded', aberto ? 'false' : 'true');
      lista.hidden = aberto;
    });

    /* isso ajudou? */
    var botoes = document.querySelectorAll('#ajudou button');
    Array.prototype.forEach.call(botoes, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(botoes, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        $('#ajudou-msg').textContent = 'Obrigado pelo retorno.';
      });
    });

    /* concluir: grava no mesmo estado do pre-work, relendo antes para não apagar o que outra aba salvou */
    var concluir = $('#concluir');
    function pintar(feito) {
      concluir.textContent = feito ? 'Concluída' : 'Marcar como concluída';
      concluir.setAttribute('aria-pressed', feito ? 'true' : 'false');
      concluir.classList.toggle('feito', feito);
    }
    pintar(feito(c, l.id, store.load()));
    concluir.addEventListener('click', function () {
      var fresh = store.load();
      var antesCompleto = concluido(c, fresh);
      var jaFeito = feito(c, l.id, fresh);
      if (c.fonte === 'squad') {
        alterarAcademia(function (a) {
          if (jaFeito) a.lidas = a.lidas.filter(function (x) { return x !== l.id; });
          else a.lidas.push(l.id);
        });
      } else {
        if (jaFeito) delete fresh.prework.blocks[l.id];
        else fresh.prework.blocks[l.id] = true;
        fresh.updatedAt = new Date().toISOString();
        store.save(fresh);
      }
      fresh = store.load();
      pintar(!jaFeito);
      var feitoAgora = !jaFeito;
      var conquista = $('#conquista');
      if (!antesCompleto && concluido(c, fresh)) {
        sincronizarSelos();
        clear(conquista);
        conquista.appendChild(badge(c, true, 96));
        var t = el('div');
        t.appendChild(el('b', null, 'Você ganhou o selo ' + c.titulo));
        t.appendChild(el('p', 'muted', 'Todas as lições deste curso estão concluídas.'));
        var ver = el('a', 'btn-sec', 'Ver seu selo');
        ver.href = 'selo.html?c=' + c.id;
        t.appendChild(ver);
        conquista.appendChild(t);
        conquista.hidden = false;
        alinharTudo();
      } else if (!feitoAgora) {
        conquista.hidden = true;
      }
    });

    /* anterior e próxima */
    var nav = $('#licao-nav');
    function cartao(idEl, rotulo, titulo, href, cls) {
      var a = el('a', 'nav-cartao ' + cls);
      a.id = idEl;
      a.href = href;
      a.appendChild(el('span', 'nav-rotulo', rotulo));
      a.appendChild(el('span', 'nav-titulo', titulo));
      nav.appendChild(a);
    }
    if (idx > 0) cartao('anterior', 'Lição anterior', lic[idx - 1].title, 'licao.html?c=' + c.id + '&l=' + lic[idx - 1].id, 'anterior');
    if (idx < lic.length - 1) cartao('proxima', 'Próxima lição', lic[idx + 1].title, 'licao.html?c=' + c.id + '&l=' + lic[idx + 1].id, 'proxima');
    else cartao('proxima', 'Selo de conclusão', c.titulo, 'curso.html?c=' + c.id, 'proxima');

    $('#licao').hidden = false;
    alinharTudo();
  }

  /* ---------- sua jornada ---------- */
  function jornada() {
    var state = store.load();
    var ultima = ui().ultima || {};
    var marcados = salvos();
    var andamento = CURSOS.filter(function (c) { return estado(c, state).tipo === 'andamento'; });
    var prontos = CURSOS.filter(function (c) { return estado(c, state).tipo === 'concluido'; });
    var guardados = CURSOS.filter(function (c) { return marcados[c.id] === true; });
    andamento.sort(function (x, y) { return (y.id === ultima.c) - (x.id === ultima.c); });

    function linha(c, comBotao) {
      var li = el('li', 'linha');
      var a = el('a', 'linha-link');
      a.href = 'curso.html?c=' + c.id;
      a.appendChild(badge(c, concluido(c, state), 64));
      var t = el('span', 'linha-texto');
      t.appendChild(el('b', 'linha-titulo', c.titulo));
      t.appendChild(el('span', 'curso-meta', meta(c)));
      a.appendChild(t);
      li.appendChild(a);
      var chip = chipEstado(c, state);
      if (chip) li.appendChild(chip);
      if (comBotao) {
        var pendente = licoes(c).filter(function (l) { return !feito(c, l.id, state); })[0] || licoes(c)[0];
        var cont = el('a', 'btn', 'Continuar');
        cont.id = 'continuar';
        cont.href = 'licao.html?c=' + c.id + '&l=' + (c.id === ultima.c && !feito(c, ultima.l, state) ? ultima.l : pendente.id);
        li.appendChild(cont);
      } else if (estado(c, state).tipo === 'concluido') {
        var ver = el('a', 'btn-sec', 'Ver selo');
        ver.href = 'selo.html?c=' + c.id;
        li.appendChild(ver);
      }
      return li;
    }
    function secao(idLista, itens, vazio, comBotao) {
      var ul = $(idLista);
      if (!itens.length) { var p = el('p', 'muted vazio', vazio); ul.parentNode.insertBefore(p, ul); ul.hidden = true; return; }
      itens.forEach(function (c, i) { ul.appendChild(linha(c, comBotao && i === 0)); });
    }
    secao('#andamento', andamento, 'Nenhum curso em andamento. Escolha um no catálogo para começar.', true);
    secao('#concluidos', prontos, 'Você ainda não concluiu nenhum curso.', false);
    secao('#salvos', guardados, 'Nada salvo ainda. Use o marcador nos cards para guardar um curso aqui.', false);
    $('#resumo-jornada').textContent = prontos.length + ' de ' + CURSOS.length + ' cursos concluídos · ' + andamento.length + ' em andamento';

    /* Exportar: o mesmo componente do pre-work e da pesquisa; esta página só é dona do campo github. */
    if (window.R2SExportUI) {
      var atual = store.load();
      window.R2SExportUI.init({
        store: store,
        getState: function () { return atual; },
        setState: function (next) { atual = next; },
        persist: function () {
          var fresh = store.load();
          fresh.github = atual.github;
          store.save(fresh);
        },
        hydrate: function () { location.reload(); },
        clearDrafts: function () {},
      });
    }
    alinharTudo();
  }

  /* ---------- página do selo ---------- */
  function seloPagina() {
    var c = cursoPorId(param('c'));
    if (!c) { $('#nao-encontrado').hidden = false; return; }
    var state = store.load();
    var ganho = concluido(c, state);
    document.title = 'Selo ' + c.titulo + ' · R2S Academy';
    migalhas($('#migalhas'), [
      { texto: 'Academy', href: 'index.html' },
      { texto: 'Cursos', href: 'index.html#cursos-titulo' },
      { texto: c.titulo, href: 'curso.html?c=' + c.id },
    ]);
    $('#titulo').textContent = 'Selo ' + c.titulo;
    $('#voltar').href = 'curso.html?c=' + c.id;

    var datas = academia(sincronizarSelos()).selos;
    var arte = $('#arte-selo');
    function desenhar() {
      clear(arte);
      arte.appendChild(seloCompleto(c, ganho ? (ui().nome || '') : '', ganho ? datas[c.id] : hoje()));
    }
    desenhar();

    if (!ganho) {
      var faltam = licoes(c).length - feitas(c, state).length;
      $('#estado').textContent = 'Bloqueado. Conclua ' + plural(faltam, 'lição', 'lições') + ' de ' + c.titulo + ' para ganhar este selo.';
      arte.classList.add('bloqueado');
      $('#personalizar').hidden = true;
      $('#ir-curso').hidden = false;
      $('#ir-curso').href = 'curso.html?c=' + c.id;
    } else {
      $('#estado').textContent = 'Você concluiu ' + c.titulo + ' em ' + dataLonga(datas[c.id]) + '.';
      var nome = $('#nome-selo');
      nome.value = ui().nome || '';
      nome.addEventListener('input', function () {
        setUi({ nome: nome.value.trim() });
        var alvo = $('#selo-nome');
        alvo.textContent = nome.value.trim() || 'Seu nome';
        alvo.setAttribute('font-size', '40');
        ART.ajustarLargura(alvo);
      });
      $('#imprimir').addEventListener('click', function () { window.print(); });
      arte.classList.add('ganho');
    }
    $('#selo-pagina').hidden = false;
    alinharTudo();
  }

  chrome();
  sincronizarSelos();
  if ($('#cursos')) home();
  else if ($('#curso')) curso();
  else if ($('#licao')) licao();
  else if ($('#selo-pagina')) seloPagina();
  else if ($('#pagina-jornada')) jornada();
})();
