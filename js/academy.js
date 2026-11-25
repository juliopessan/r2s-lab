/* R2S Academy — catálogo, página do curso e página da lição, no modelo da Claude Academy.
 * Script clássico (abre por file://). O conteúdo das lições vem de js/academy-content.js, gerado a partir
 * do pre-work; o progresso é o mesmo estado do navegador que o pre-work usa. Todo texto entra por textContent. */
(function () {
  'use strict';

  var P = window.R2SProgress;
  var store = window.R2SStore;
  var C = window.R2S_ACADEMY;
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
    c.quizzes = licoes(c).reduce(function (a, l) { return a.concat(conteudo(l.id).quizzes); }, []);
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

  function licoes(c) { return P.PREWORK_BLOCKS.filter(function (b) { return b.part === c.parte; }); }
  function conteudo(id) { return C.lessons[id]; }
  function minutos(c) { return licoes(c).reduce(function (a, b) { return a + b.min; }, 0); }
  function cursoPorId(id) { return CURSOS.filter(function (c) { return c.id === id; })[0]; }
  function feitas(c, state) { return licoes(c).filter(function (l) { return state.prework.blocks[l.id] === true; }); }
  function concluido(c, state) { return feitas(c, state).length === licoes(c).length; }
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

  /* ---------- selo (badge), no modelo do selo de conclusão da Claude Academy ----------
   * Cartão de cor cheia, polígono irregular claro, ícone de traço com a interseção preenchida na cor do curso.
   * As cores são da "arte" do selo e não mudam com o tema, como o papel do certificado. */
  var MATERIA = {
    p1: { fundo: '#5F927E', papel: '#D6E6DE', // conversa com o modelo: dois balões
      a: 'M40 14c15 0 27 10 27 23s-12 23-27 23c-4 0-7-1-10-2l-14 6 4-12c-4-4-7-9-7-15 0-13 12-23 27-23z',
      b: 'M62 40c13 0 24 9 24 20 0 5-2 10-6 13l4 11-13-5c-3 1-6 1-9 1-13 0-24-9-24-20s11-20 24-20z', extra: '' },
    p2: { fundo: '#7A73B3', papel: '#DEDBF0', // do pedido ao problema: lupa sobre o alvo
      a: 'M40 16a24 24 0 1 1 0 48a24 24 0 1 1 0-48z',
      b: 'M64 34a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M57 57L76 76M64 48a6 6 0 1 1 0 12a6 6 0 1 1 0-12z' },
    p3: { fundo: '#D97757', papel: '#F1CDBC', // valor e custo: duas moedas e as barras
      a: 'M40 20a24 24 0 1 1 0 48a24 24 0 1 1 0-48z',
      b: 'M62 34a24 24 0 1 1 0 48a24 24 0 1 1 0-48z', extra: 'M30 44h20M30 52h14M14 90h72' },
    p4: { fundo: '#5A80AD', papel: '#D5E1EF', // responsabilidade: escudo e a pessoa que responde
      a: 'M50 12l30 12v24c0 20-13 32-30 38-17-6-30-18-30-38V24z',
      b: 'M50 34a12 12 0 1 1 0 24a12 12 0 1 1 0-24z', extra: 'M30 92c3-13 14-20 20-20s17 7 20 20' },
    p5: { fundo: '#C0953A', papel: '#F0E2BF', // case brief: documento com o visto
      a: 'M22 12h34l18 18v58H22z',
      b: 'M70 54a18 18 0 1 1 0 36a18 18 0 1 1 0-36z', extra: 'M56 12v18h18M32 44h26M32 56h18M62 72l6 6 11-12' },
  };
  var TINTA = '#191A1D';
  var uid = 0;

  /** Polígono irregular, sempre igual para o mesmo curso (como um selo recortado à mão). */
  function poligono(c, cx, cy, rx, ry) {
    var seed = c.parte * 9973;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var n = 11;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * (i + rnd() * 0.18)) / n - Math.PI / 2;
      var k = 0.95 + rnd() * 0.06;
      pts.push((cx + rx * k * Math.cos(ang)).toFixed(1) + ' ' + (cy + ry * k * Math.sin(ang)).toFixed(1));
    }
    return 'M' + pts.join('L') + 'Z';
  }

  /** Ícone em 0..100, posicionado em (x, y) com o lado `lado`. */
  function icone(c, x, y, lado, contorno) {
    var m = MATERIA[c.id];
    var id = 'clip-' + c.id + '-' + (uid++);
    var g = svgEl('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + (lado / 100) + ')', class: 'selo-icone' });
    var defs = svgEl('defs');
    var clip = svgEl('clipPath', { id: id });
    clip.appendChild(svgEl('path', { d: m.a }));
    defs.appendChild(clip);
    g.appendChild(defs);
    g.appendChild(svgEl('path', { d: m.b, fill: m.fundo, 'clip-path': 'url(#' + id + ')' }));
    var traco = { fill: 'none', stroke: TINTA, 'stroke-width': String(contorno), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    [m.a, m.b, m.extra].forEach(function (d) { if (d) { var p = svgEl('path', traco); p.setAttribute('d', d); g.appendChild(p); } });
    return g;
  }

  /** Selo pequeno (cards, listas): fundo de cor cheia, polígono e ícone. Decorativo: o estado vai em texto ao lado. */
  function badge(c, ganho, tamanho) {
    var m = MATERIA[c.id];
    var wrap = el('span', 'badge t-' + c.id + (ganho ? ' ganho' : ' bloqueado'));
    wrap.style.setProperty('--tam', (tamanho || 48) + 'px');
    var svg = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(svgEl('rect', { width: '100', height: '100', rx: '16', fill: m.fundo }));
    svg.appendChild(svgEl('path', { d: poligono(c, 50, 51, 44, 42), fill: m.papel }));
    svg.appendChild(icone(c, 24, 24, 52, 4.2));
    wrap.appendChild(svg);
    wrap.appendChild(el('span', 'badge-brilho'));
    return wrap;
  }

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function dataLonga(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? Number(m[3]) + ' de ' + MESES[Number(m[2]) - 1] + ' de ' + m[1] : '';
  }
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** Quebra o título em até duas linhas, no espaço mais perto do meio. */
  function linhas(titulo) {
    if (titulo.length <= 16) return [titulo];
    var meio = titulo.length / 2;
    var melhor = -1;
    for (var i = 0; i < titulo.length; i++) if (titulo[i] === ' ' && (melhor === -1 || Math.abs(i - meio) < Math.abs(melhor - meio))) melhor = i;
    return melhor === -1 ? [titulo] : [titulo.slice(0, melhor), titulo.slice(melhor + 1)];
  }

  /** Selo completo, no formato do selo de conclusão da Claude Academy (1100 × 750). */
  function seloCompleto(c, nome, dataIso) {
    var m = MATERIA[c.id];
    var svg = svgEl('svg', { viewBox: '0 0 1100 750', id: 'selo-svg', role: 'img', 'aria-labelledby': 'selo-svg-titulo' });
    var titulo = svgEl('title', { id: 'selo-svg-titulo' });
    titulo.textContent = 'Selo de conclusão do curso ' + c.titulo + (nome ? ', concedido a ' + nome : '');
    svg.appendChild(titulo);
    svg.appendChild(svgEl('rect', { width: '1100', height: '750', fill: m.fundo }));
    svg.appendChild(svgEl('path', { d: poligono(c, 550, 372, 335, 312), fill: m.papel }));

    var arcoId = 'arco-' + c.id + '-' + (uid++);
    var defs = svgEl('defs');
    defs.appendChild(svgEl('path', { id: arcoId, d: 'M355 318 A195 195 0 0 1 745 318' }));
    svg.appendChild(defs);
    var arco = svgEl('text', { class: 'selo-arco', fill: m.fundo, 'font-size': '27', 'letter-spacing': '6' });
    var tp = svgEl('textPath', { href: '#' + arcoId, startOffset: '50%', 'text-anchor': 'middle' });
    tp.textContent = 'SELO DE CONCLUSÃO DE CURSO';
    arco.appendChild(tp);
    svg.appendChild(arco);

    svg.appendChild(icone(c, 494, 176, 112, 3.2));

    var ls = linhas(c.titulo);
    var tam = ls.length === 1 ? 92 : 66;
    var curso = svgEl('text', { id: 'selo-curso', x: '550', y: ls.length === 1 ? '438' : '400', 'text-anchor': 'middle', fill: TINTA, 'font-size': String(tam), class: 'selo-serif' });
    ls.forEach(function (t, i) {
      var span = svgEl('tspan', { x: '550', dy: i ? String(Math.round(tam * 1.08)) : '0' });
      span.textContent = t;
      curso.appendChild(span);
    });
    svg.appendChild(curso);

    var para = svgEl('text', { x: '550', y: '528', 'text-anchor': 'middle', fill: TINTA, 'font-size': '28', class: 'selo-serif' });
    para.textContent = 'Concedido a';
    svg.appendChild(para);
    var quem = svgEl('text', { id: 'selo-nome', x: '550', y: '576', 'text-anchor': 'middle', fill: TINTA, 'font-size': '40', class: 'selo-serif' });
    quem.textContent = nome || 'Seu nome';
    svg.appendChild(quem);

    var marca = svgEl('g', { transform: 'translate(40 668)' });
    marca.appendChild(svgEl('path', { d: 'M18 0l5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1z', fill: '#FFFFFF' }));
    var nomeMarca = svgEl('text', { x: '48', y: '30', fill: '#FFFFFF', 'font-size': '36', class: 'selo-serif' });
    nomeMarca.textContent = 'R2S Academy';
    marca.appendChild(nomeMarca);
    svg.appendChild(marca);

    var data = svgEl('text', { id: 'selo-data', x: '1060', y: '698', 'text-anchor': 'end', fill: '#FFFFFF', 'font-size': '20', 'letter-spacing': '2', class: 'selo-sans' });
    data.textContent = ('Emitido em ' + dataLonga(dataIso)).toUpperCase();
    svg.appendChild(data);
    return svg;
  }

  /* ---------- cabeçalho e rodapé ---------- */
  function chrome() {
    var toggle = $('#tema-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        lsSet(THEME_KEY, next);
      });
    }
    var rodape = $('#rodape');
    if (!rodape) return;
    var inner = el('div', 'rodape-in');
    function coluna(titulo, links) {
      var col = el('div', 'rodape-col');
      col.appendChild(el('h2', 'rodape-titulo', titulo));
      var ul = el('ul', 'plain');
      links.forEach(function (l) { var li = el('li'); var a = el('a', null, l[0]); a.href = l[1]; li.appendChild(a); ul.appendChild(li); });
      col.appendChild(ul);
      return col;
    }
    inner.appendChild(coluna('Cursos', CURSOS.map(function (c) { return [c.titulo, 'curso.html?c=' + c.id]; })));
    inner.appendChild(coluna('Temas', TEMAS.map(function (t) { return [t.titulo, 'index.html#temas-titulo']; })));
    inner.appendChild(coluna('R2S Lab', [['Pre-work', '../00-prework/index.html'], ['Pesquisa de satisfação', '../05-encerramento/pesquisa.html']]));
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
    function render(primeira) {
      clear(lista);
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
        capa.style.background = MATERIA[c.id].fundo;
        capa.appendChild(badge(c, concluido(c, state), 104));
        a.appendChild(capa);
        var corpo = el('span', 'curso-corpo');
        corpo.appendChild(el('b', 'curso-titulo', c.titulo));
        corpo.appendChild(el('span', 'curso-meta', meta(c)));
        corpo.appendChild(el('span', 'curso-resumo', c.resumo));
        var n = feitas(c, state).length;
        corpo.appendChild(el('span', 'curso-progresso', n ? n + ' de ' + licoes(c).length + ' lições' : 'Não iniciado'));
        a.appendChild(corpo);
        li.appendChild(a);
        lista.appendChild(li);
      });
      $('#sem-resultado').hidden = visiveis.length > 0;
    }
    $('#busca').addEventListener('input', function (e) { termo = e.target.value; render(false); });
    render(true);

    var ganhos = CURSOS.filter(function (c) { return concluido(c, state); }).length;
    $('#selos-resumo').textContent = ganhos
      ? ganhos + ' de ' + CURSOS.length + ' selos.'
      : '0 de ' + CURSOS.length + ' selos. Conclua um curso para ganhar o primeiro.';
    var selos = $('#selos');
    CURSOS.forEach(function (c) {
      var ok = concluido(c, state);
      var li = el('li', 'selo' + (ok ? ' ganho' : ''));
      li.appendChild(badge(c, ok, 56));
      var a = el('a', 'selo-titulo', c.titulo);
      a.href = ok ? 'selo.html?c=' + c.id : 'curso.html?c=' + c.id;
      li.appendChild(a);
      li.appendChild(el('span', 'selo-estado', ok ? 'Concluído' : 'Bloqueado'));
      selos.appendChild(li);
    });
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
    $('#faixa-arte').appendChild(badge(c, completo, 168));

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
    migalhas($('#migalhas'), [
      { texto: 'Academy', href: 'index.html' },
      { texto: 'Cursos', href: 'index.html#cursos-titulo' },
      { texto: c.titulo, href: 'curso.html?c=' + c.id },
    ]);
    $('#titulo').textContent = l.title;
    pilulas($('#meta'), ['Lição ' + (idx + 1), l.min + ' min']);

    /* aviso de progresso */
    var aviso = $('#aviso-progresso');
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

    if (dados.exercise || dados.tool || dados.quizzes.length) {
      var pratica = secao('sec-pratica', 'Na prática');
      if (dados.exercise) {
        var fazer = el('div', 'fazer');
        fazer.appendChild(el('b', null, dados.exercise.label));
        fazer.appendChild(el('p', null, dados.exercise.text));
        pratica.appendChild(fazer);
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
    pintar(store.load().prework.blocks[l.id] === true);
    concluir.addEventListener('click', function () {
      var fresh = store.load();
      var antesCompleto = concluido(c, fresh);
      var feito = fresh.prework.blocks[l.id] === true;
      if (feito) delete fresh.prework.blocks[l.id];
      else fresh.prework.blocks[l.id] = true;
      fresh.updatedAt = new Date().toISOString();
      store.save(fresh);
      pintar(!feito);
      var conquista = $('#conquista');
      if (!antesCompleto && concluido(c, fresh)) {
        var datas = ui().concluidoEm || {};
        if (!datas[c.id]) { datas[c.id] = hoje(); setUi({ concluidoEm: datas }); }
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
      } else if (feito) {
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

    var datas = ui().concluidoEm || {};
    if (ganho && !datas[c.id]) { datas[c.id] = hoje(); setUi({ concluidoEm: datas }); }
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
        $('#selo-nome').textContent = nome.value.trim() || 'Seu nome';
      });
      $('#imprimir').addEventListener('click', function () { window.print(); });
      arte.classList.add('ganho');
    }
    $('#selo-pagina').hidden = false;
  }

  chrome();
  if ($('#cursos')) home();
  else if ($('#curso')) curso();
  else if ($('#licao')) licao();
  else if ($('#selo-pagina')) seloPagina();
})();
