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

  /* ---------- selo (badge) ---------- */
  var ICONES = {
    p1: 'M16 18h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4h-3a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z',
    p2: 'M24 16a8 8 0 1 1 0 16a8 8 0 1 1 0-16zM24 20.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z',
    p3: 'M17 31v-7M24 31V17M31 31v-10M14 31h20',
    p4: 'M24 15v17M18 32h12M15 19h18M15 19l-3 7h6zM33 19l-3 7h6z',
    p5: 'M18 15h9l5 5v13H18zM27 15v5h5M21 25h8M21 29h6',
  };
  function contornoSelo() {
    var pts = [];
    for (var i = 0; i < 24; i++) {
      var r = i % 2 ? 20.6 : 22.6;
      var a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
      pts.push((24 + r * Math.cos(a)).toFixed(2) + ' ' + (24 + r * Math.sin(a)).toFixed(2));
    }
    return 'M' + pts.join('L') + 'Z';
  }
  var CONTORNO = contornoSelo();

  /** Selo de um curso: ganho (colorido, com brilho) ou bloqueado (apagado). Decorativo: o estado vai em texto ao lado. */
  function badge(c, ganho, tamanho) {
    var wrap = el('span', 'badge t-' + c.id + (ganho ? ' ganho' : ' bloqueado'));
    wrap.style.setProperty('--tam', (tamanho || 48) + 'px');
    var svg = svgEl('svg', { viewBox: '0 0 48 48', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(svgEl('path', { d: CONTORNO, class: 'badge-forma' }));
    svg.appendChild(svgEl('circle', { cx: '24', cy: '24', r: '15.5', class: 'badge-anel' }));
    svg.appendChild(svgEl('path', { d: ICONES[c.id], class: 'badge-icone' }));
    wrap.appendChild(svg);
    wrap.appendChild(el('span', 'badge-brilho'));
    return wrap;
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
        capa.appendChild(badge(c, concluido(c, state), 64));
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
      a.href = 'curso.html?c=' + c.id;
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
    fim.appendChild(el('span', null, 'Selo de conclusão'));
    $('#outline').appendChild(fim);

    if (completo) {
      var selo = $('#selo');
      selo.appendChild(badge(c, true, 72));
      var t = el('div');
      t.appendChild(el('b', 'selo-titulo', c.titulo));
      t.appendChild(el('span', 'selo-estado', 'Concluído'));
      t.appendChild(el('p', 'muted', 'Você concluiu todas as lições deste curso.'));
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
        clear(conquista);
        conquista.appendChild(badge(c, true, 96));
        var t = el('div');
        t.appendChild(el('b', null, 'Você ganhou o selo ' + c.titulo));
        t.appendChild(el('p', 'muted', 'Todas as lições deste curso estão concluídas.'));
        var ver = el('a', null, 'Ver o curso');
        ver.href = 'curso.html?c=' + c.id;
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

  chrome();
  if ($('#cursos')) home();
  else if ($('#curso')) curso();
  else if ($('#licao')) licao();
})();
