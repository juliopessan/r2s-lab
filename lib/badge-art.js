/* R2S Academy — arte dos selos de conclusão, no modelo do selo da Claude Academy.
 * UMD: no Node exporta os dados (cores, ícones, geometria); no navegador vira `window.R2SBadgeArt`.
 * As funções de desenho recebem o `document`, montam SVG puro e depois alinham por medição (getBBox),
 * para que ícone e título fiquem centrados de verdade, qualquer que seja o desenho do ícone. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.R2SBadgeArt = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var TINTA = '#333333'; // cinza 80
  var sans = "'Segoe UI','Segoe UI Variable',system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif";

  /* Geometria do selo completo, medida no PDF de referência (1100 × 750). */
  var W = 1100;
  var H = 750;
  var CX = 550;
  var CY = 372;
  var RAIO = 318;
  var ARCO = { cx: 550, cy: 402, r: 252 };
  var ICONE = { cx: 550, cy: 244, lado: 118 };
  var TITULO = { y1: 440, y2a: 404, larguraMax: 500 };

  /* Cada curso: fundo de cor cheia, papel claro do polígono, cor do rodapé, cor de destaque (arco e preenchimento)
   * e o ícone de traço. A cor codifica a FAMÍLIA, não o curso: o pre-work é Glow (o laranja da marca) e a
   * jornada da squad percorre a família de gradientes nomeados, de Solar (G0) a Aurora (G4).
   * `a` e `b` são formas fechadas; a interseção delas é preenchida com a cor de destaque. */
  var MATERIA = {
    p1: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600' }, // conversa com o modelo
    p2: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600' }, // lupa sobre o alvo
    p3: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600' }, // duas moedas
    p4: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600' }, // escudo e a pessoa que responde
    p5: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600' }, // documento com o visto
    s1: { fundo: '#FFD700', papel: '#FFF6CC', rodape: '#333333', destaque: '#7A5C00' }, // intake: a bandeja que recebe o caso
    s2: { fundo: '#FFB414', papel: '#FFEDC7', rodape: '#333333', destaque: '#7A4E00' }, // discover: duas pessoas que se escutam
    s3: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600' }, // frame value: a etiqueta de valor e a moeda
    s4: { fundo: '#B43C14', papel: '#F3D9CF', rodape: '#FFFFFF', destaque: '#B43C14' }, // design: duas opções lado a lado
    s5: { fundo: '#C80000', papel: '#F6D1D1', rodape: '#FFFFFF', destaque: '#C80000' }, // evaluate: a prancheta e a medida
    s6: { fundo: '#890078', papel: '#EED2EA', rodape: '#FFFFFF', destaque: '#890078' }, // pitch: a tela e o foco da decisão
  };

  /* Ícones de traço no estilo das ilustrações da Claude Academy: desenho com detalhe, partes preenchidas
   * na cor de destaque e um leve tremido de mão (filtro). Desenhados em 0..100; `alinhar` centra pela caixa.
   *   cor: formas preenchidas com a cor de destaque · linhas: traço · tinta: pontos e detalhes cheios
   *   claro: detalhes na cor do papel sobre a cor de destaque
   *   clip: { a, b } preenche a interseção de duas formas, como nos balões do Claude 101. */
  var PONTO = function (x, y, r) { return 'M' + (x - r) + ' ' + y + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0z'; };
  var ICONES = {
    p1: { // dois balões de conversa: pergunte e o modelo responde
      clip: { a: 'M14 24c0-7 5-12 12-12h26c7 0 12 5 12 12v14c0 7-5 12-12 12H34l-11 9 2-9c-6-1-11-6-11-12z',
              b: 'M40 44c0-7 5-12 12-12h22c7 0 12 5 12 12v14c0 7-5 12-12 12h-3l3 11-13-11H52c-7 0-12-5-12-12z' },
      linhas: ['M14 24c0-7 5-12 12-12h26c7 0 12 5 12 12v14c0 7-5 12-12 12H34l-11 9 2-9c-6-1-11-6-11-12z',
               'M40 44c0-7 5-12 12-12h22c7 0 12 5 12 12v14c0 7-5 12-12 12h-3l3 11-13-11H52c-7 0-12-5-12-12z',
               'M24 25h22M24 32h14'],
      tinta: [PONTO(55, 54, 2.2), PONTO(63, 54, 2.2), PONTO(71, 54, 2.2)] },
    p2: { // lupa sobre a pergunta: do pedido ao problema
      cor: ['M60 61l23 23a5.5 5.5 0 0 1-7.8 7.8L52 68.8z'],
      linhas: ['M40 12a29 29 0 1 1 0 58a29 29 0 1 1 0-58z', 'M40 19a22 22 0 0 0-19 11',
               'M60 61l23 23a5.5 5.5 0 0 1-7.8 7.8L52 68.8', 'M32 35c0-5 4-9 9-9s9 4 9 9c0 7-9 7-9 14'],
      tinta: [PONTO(41, 57, 2.4)] },
    p3: { // pilha de moedas e barras que sobem: valor e custo
      cor: ['M16 46a18 5.5 0 1 0 36 0a18 5.5 0 1 0-36 0z', 'M76 30h9v50h-9z'],
      linhas: ['M16 46a18 5.5 0 1 0 36 0a18 5.5 0 1 0-36 0z', 'M16 46v30M52 46v30', 'M16 76a18 5.5 0 0 0 36 0',
               'M16 56a18 5.5 0 0 0 36 0M16 66a18 5.5 0 0 0 36 0', 'M60 54h9v26h-9zM76 30h9v50h-9z',
               'M58 40l10-10 6 5 12-14M80 20h7v7', 'M10 86h82'] },
    p4: { // balança: quem responde pela decisão
      cor: ['M10 54h26c0 8-6 12-13 12s-13-4-13-12z'],
      linhas: ['M50 18v62', 'M36 86h28M41 86c1-4 17-4 18 0', 'M18 30l64-6', 'M23 30l-11 24M23 30l11 24',
               'M10 54h26c0 8-6 12-13 12s-13-4-13-12z', 'M77 25l-11 22M77 25l11 22', 'M64 47h26c0 8-6 12-13 12s-13-4-13-12z'],
      tinta: [PONTO(50, 15, 3.2)] },
    p5: { // documento com fita marcadora e assinatura: o case brief
      cor: ['M44 12v24l6-5 6 5V12z'],
      linhas: ['M24 12h40l12 12v64H24z', 'M64 12v12h12', 'M44 12v24l6-5 6 5V12', 'M32 46h32M32 54h36M32 62h22',
               'M32 78c3-6 6 4 10-2s5 4 9-1 6-3 9 1'] },
    s1: { // bandeja que recebe o caso: intake
      cor: ['M60 10l10 10H60z'],
      linhas: ['M36 10h24l10 10v30H36z', 'M60 10v10h10', 'M42 26h20M42 33h20M42 40h12',
               'M12 58l9-18h10M69 40h10l9 18', 'M12 58v24h76V58', 'M12 58h22l4 8h24l4-8h22'] },
    s2: { // duas pessoas e a conversa: ouvir antes de resolver
      cor: ['M40 8h28c4 0 7 3 7 7v7c0 4-3 7-7 7H56l-8 7v-7h-8c-4 0-7-3-7-7v-7c0-4 3-7 7-7z'],
      linhas: ['M40 8h28c4 0 7 3 7 7v7c0 4-3 7-7 7H56l-8 7v-7h-8c-4 0-7-3-7-7v-7c0-4 3-7 7-7z',
               'M27 40a10 10 0 1 1 0 20a10 10 0 1 1 0-20z', 'M9 90c0-14 8-22 18-22s18 8 18 22',
               'M73 44a9 9 0 1 1 0 18a9 9 0 1 1 0-18z', 'M57 90c0-12 7-20 16-20s16 8 16 20'],
      claro: [PONTO(46, 18.5, 2), PONTO(54, 18.5, 2), PONTO(62, 18.5, 2)] },
    s3: { // etiqueta de valor: frame value e o G1
      cor: ['M50 12h32v32L50 76 18 44z'],
      linhas: ['M50 12h32v32L50 76 18 44z', 'M72 22a4 4 0 1 1 0 8a4 4 0 1 1 0-8z', 'M74 24c4-10 14-12 18-4s-2 14-10 10',
               'M54 36c-3-3-12-2-11 3s11 4 10 10-10 5-12 2M48 31v28'] },
    s4: { // duas janelas de rascunho: o design e o ADR
      cor: ['M38 40h50v9H38z'],
      linhas: ['M12 14h50v38H12z', 'M12 23h50', 'M18 31h22M18 38h14', 'M38 40h50v44H38z', 'M38 49h50',
               'M56 60l-7 7 7 7M70 60l7 7-7 7M66 57l-6 20'],
      tinta: [PONTO(17, 18.5, 1.6), PONTO(23, 18.5, 1.6), PONTO(29, 18.5, 1.6)] },
    s5: { // medidor e checklist: medir antes de lançar
      cor: ['M66 34a32 32 0 0 1 16 26h-9a23 23 0 0 0-11-18z'],
      linhas: ['M18 60a32 32 0 0 1 64 0', 'M66 34a32 32 0 0 1 16 26h-9a23 23 0 0 0-11-18z',
               'M24 42l6 4M36 31l3 6M50 28v7M64 31l-3 6', 'M50 60l16-18', 'M14 60h72', 'M24 76l4 4 8-8M44 76h32'],
      tinta: [PONTO(50, 60, 4)] },
    s6: { // quadro de apresentação: o pitch e a decisão
      cor: ['M26 40h8v12h-8zM40 32h8v20h-8zM54 24h8v28h-8z'],
      linhas: ['M12 12h76v48H12z', 'M8 12h84', 'M26 40h8v12h-8zM40 32h8v20h-8zM54 24h8v28h-8z',
               'M68 40l10-10M72 30h6v6', 'M50 60v14M36 88l14-14 14 14'] },
  };

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function dataLonga(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? Number(m[3]) + ' de ' + MESES[Number(m[2]) - 1] + ' de ' + m[1] : '';
  }

  /** Polígono irregular de 12 lados, sempre igual para a mesma semente (como um selo recortado à mão). */
  function poligono(seed, cx, cy, r, irregular) {
    var jit = irregular ? 0.55 : 0.36;
    var k0 = irregular ? 0.9 : 0.955;
    var kr = irregular ? 0.12 : 0.07;
    var s = (seed * 9973) % 2147483647 || 1;
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    var n = 12;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * (i + (rnd() - 0.5) * jit)) / n - Math.PI / 2;
      var k = k0 + rnd() * kr;
      pts.push((cx + r * k * Math.cos(ang)).toFixed(1) + ' ' + (cy + r * k * Math.sin(ang)).toFixed(1));
    }
    return 'M' + pts.join('L') + 'Z';
  }

  /** Quebra o título em até duas linhas, no espaço mais perto do meio. */
  function linhas(titulo) {
    if (titulo.length <= 16) return [titulo];
    var meio = titulo.length / 2;
    var melhor = -1;
    for (var i = 0; i < titulo.length; i++) {
      if (titulo[i] === ' ' && (melhor === -1 || Math.abs(i - meio) < Math.abs(melhor - meio))) melhor = i;
    }
    return melhor === -1 ? [titulo] : [titulo.slice(0, melhor), titulo.slice(melhor + 1)];
  }

  var uid = 0;
  function mk(doc, tag, attrs, text) {
    var n = doc.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /** Ícone desenhado em 0..100; `alinhar` depois o centra em (cx, cy) com o lado dado. */
  function icone(doc, id, cx, cy, lado, traco) {
    var m = MATERIA[id];
    var ic = ICONES[id];
    var n = uid++;
    var g = mk(doc, 'g', { class: 'selo-icone', transform: 'translate(' + cx + ' ' + cy + ')', 'data-lado': String(lado), 'data-traco': String(traco) });
    var forma = mk(doc, 'g', { class: 'selo-icone-forma', transform: 'scale(' + (lado / 100) + ') translate(-50 -50)' });
    var defs = mk(doc, 'defs');
    /* tremido de mão: um deslocamento leve, sempre igual para o mesmo ícone */
    var filtroId = 'r2s-mao-' + id + '-' + n;
    var filtro = mk(doc, 'filter', { id: filtroId, x: '-10%', y: '-10%', width: '120%', height: '120%' });
    filtro.appendChild(mk(doc, 'feTurbulence', { type: 'fractalNoise', baseFrequency: '0.045', numOctaves: '2', seed: String(id.charCodeAt(1)) }));
    filtro.appendChild(mk(doc, 'feDisplacementMap', { in: 'SourceGraphic', scale: '2.4' }));
    defs.appendChild(filtro);
    forma.appendChild(defs);
    var desenho = mk(doc, 'g', { filter: 'url(#' + filtroId + ')' });
    if (ic.clip) {
      var clipId = 'r2s-clip-' + id + '-' + n;
      var clip = mk(doc, 'clipPath', { id: clipId });
      clip.appendChild(mk(doc, 'path', { d: ic.clip.a }));
      defs.appendChild(clip);
      desenho.appendChild(mk(doc, 'path', { d: ic.clip.b, fill: m.destaque, 'clip-path': 'url(#' + clipId + ')' }));
    }
    (ic.cor || []).forEach(function (d) { desenho.appendChild(mk(doc, 'path', { d: d, fill: m.destaque })); });
    (ic.linhas || []).forEach(function (d) {
      desenho.appendChild(mk(doc, 'path', { d: d, fill: 'none', stroke: TINTA, 'stroke-width': String((traco * 100) / lado), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'selo-traco' }));
    });
    (ic.tinta || []).forEach(function (d) { desenho.appendChild(mk(doc, 'path', { d: d, fill: TINTA })); });
    (ic.claro || []).forEach(function (d) { desenho.appendChild(mk(doc, 'path', { d: d, fill: m.papel, class: 'selo-claro' })); });
    forma.appendChild(desenho);
    g.appendChild(forma);
    return g;
  }

  /** Selo pequeno: quadrado de cor cheia, polígono claro e o ícone. */
  function miniatura(doc, curso) {
    var m = MATERIA[curso.id];
    var svg = mk(doc, 'svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false', class: 'selo-mini' });
    svg.appendChild(mk(doc, 'rect', { width: '100', height: '100', fill: m.fundo }));
    svg.appendChild(mk(doc, 'path', { d: poligono(curso.seed, 50, 50, 45), fill: m.papel }));
    svg.appendChild(icone(doc, curso.id, 50, 50, 50, 3.4));
    return svg;
  }

  /** Selo completo (1100 × 750). Sem `opcoes.semNome`, leva "Concedido a" e o nome. */
  function completo(doc, curso, nome, dataIso, opcoes) {
    opcoes = opcoes || {};
    var m = MATERIA[curso.id];
    var svg = mk(doc, 'svg', { xmlns: NS, viewBox: '0 0 ' + W + ' ' + H, width: String(W), height: String(H), role: 'img', class: 'selo-completo', id: opcoes.id || 'selo-svg' });
    var tituloId = 'r2s-selo-titulo-' + (uid++);
    svg.setAttribute('aria-labelledby', tituloId);
    svg.appendChild(mk(doc, 'title', { id: tituloId }, 'Selo de conclusão do curso ' + curso.titulo + (nome ? ', concedido a ' + nome : '')));
    svg.appendChild(mk(doc, 'rect', { width: String(W), height: String(H), fill: m.fundo }));
    svg.appendChild(mk(doc, 'path', { d: poligono(curso.seed, CX, CY, RAIO), fill: m.papel, class: 'selo-poligono' }));

    var arcoId = 'r2s-arco-' + (uid++);
    var defs = mk(doc, 'defs');
    defs.appendChild(mk(doc, 'path', { id: arcoId, d: 'M' + (ARCO.cx - ARCO.r) + ' ' + ARCO.cy + ' A' + ARCO.r + ' ' + ARCO.r + ' 0 0 1 ' + (ARCO.cx + ARCO.r) + ' ' + ARCO.cy }));
    svg.appendChild(defs);
    var arco = mk(doc, 'text', { class: 'selo-arco', fill: m.destaque, 'font-size': '28', 'letter-spacing': '7', 'font-family': sans, 'font-weight': '600' });
    var tp = mk(doc, 'textPath', { href: '#' + arcoId, startOffset: '50%', 'text-anchor': 'middle' }, 'SELO DE CONCLUSÃO DE CURSO');
    arco.appendChild(tp);
    svg.appendChild(arco);

    svg.appendChild(icone(doc, curso.id, ICONE.cx, ICONE.cy, ICONE.lado, 3.4));

    var serif = sans; // Segoe UI em tudo; títulos em Light (300)
    var ls = linhas(curso.titulo);
    var tam = ls.length === 1 ? 96 : 68;
    var titulo = mk(doc, 'text', { id: 'selo-curso', class: 'selo-svg-titulo', x: String(CX), y: String(ls.length === 1 ? TITULO.y1 : TITULO.y2a), 'text-anchor': 'middle', fill: TINTA, 'font-size': String(tam), 'font-family': serif, 'font-weight': '300', 'letter-spacing': '-1', 'data-largura-max': String(TITULO.larguraMax) });
    ls.forEach(function (t, i) { titulo.appendChild(mk(doc, 'tspan', { x: String(CX), dy: i ? String(Math.round(tam * 1.06)) : '0' }, t)); });
    svg.appendChild(titulo);

    if (!opcoes.semNome) {
      svg.appendChild(mk(doc, 'text', { x: String(CX), y: '532', 'text-anchor': 'middle', fill: TINTA, 'font-size': '28', 'font-family': serif }, 'Concedido a'));
      svg.appendChild(mk(doc, 'text', { id: 'selo-nome', class: 'selo-nome', x: String(CX), y: '580', 'text-anchor': 'middle', fill: TINTA, 'font-size': '40', 'font-family': serif, 'data-largura-max': '520' }, nome || 'Seu nome'));
    }

    var marca = mk(doc, 'g', { transform: 'translate(40 672)' });
    marca.appendChild(mk(doc, 'path', { d: 'M17 0l4.6 12.4 13.2.6-10.4 8.2 3.6 12.8L17 26.6 6 34l3.6-12.8L-.8 13l13.2-.6z', fill: m.rodape }));
    marca.appendChild(mk(doc, 'text', { x: '46', y: '30', fill: m.rodape, 'font-size': '34', 'font-family': sans, 'font-weight': '300' }, 'R2S Academy'));
    svg.appendChild(marca);

    if (dataIso) {
      svg.appendChild(mk(doc, 'text', { id: 'selo-data', x: String(W - 40), y: '700', 'text-anchor': 'end', fill: m.rodape, 'font-size': '21', 'letter-spacing': '2', 'font-family': sans, 'font-weight': '700' }, ('Emitido em ' + dataLonga(dataIso)).toUpperCase()));
    }
    return svg;
  }

  /* Ficha: o selo no formato da página de selos da Claude Academy. Polígono irregular grande em tom pastel,
   * ícone pequeno no topo e o nome do curso centralizado dentro. Bloqueado: polígono cinza escuro. */
  var FICHA_BLOQUEADA = { papel: '#5C5B63', tinta: '#E4E4E8' };
  /** Quebra equilibrada: 1 linha até 14 letras, senão 2 (ou 3 se passar de 30), escolhendo os pontos de
   * quebra que deixam a linha mais longa o mais curta possível. */
  function quebrarTitulo(titulo) {
    var w = titulo.split(' ');
    if (titulo.length <= 14 || w.length === 1) return [titulo];
    function linha(a, b) { return w.slice(a, b).join(' '); }
    var melhor = null;
    var nLinhas = titulo.length > 30 && w.length >= 3 ? 3 : 2;
    if (nLinhas === 2) {
      for (var i = 1; i < w.length; i++) {
        var c = [linha(0, i), linha(i, w.length)];
        var pior = Math.max(c[0].length, c[1].length);
        if (!melhor || pior < melhor.pior || (pior === melhor.pior && c[0].length > melhor.linhas[0].length)) melhor = { pior: pior, linhas: c };
      }
    } else {
      for (var x = 1; x < w.length - 1; x++) {
        for (var y = x + 1; y < w.length; y++) {
          var d = [linha(0, x), linha(x, y), linha(y, w.length)];
          var p2 = Math.max(d[0].length, d[1].length, d[2].length);
          if (!melhor || p2 < melhor.pior) melhor = { pior: p2, linhas: d };
        }
      }
    }
    return melhor.linhas;
  }
  function ficha(doc, curso, opcoes) {
    opcoes = opcoes || {};
    var m = MATERIA[curso.id];
    var bloq = opcoes.bloqueado === true;
    var papel = bloq ? FICHA_BLOQUEADA.papel : m.papel;
    var tinta = bloq ? FICHA_BLOQUEADA.tinta : TINTA;
    var svg = mk(doc, 'svg', { viewBox: '0 0 320 320', class: 'ficha' + (bloq ? ' bloqueada' : ''), 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(mk(doc, 'path', { d: poligono(curso.seed + 40, 160, 160, 156, true), fill: papel, class: 'ficha-forma' }));
    var ic = icone(doc, curso.id, 160, 96, 88, 2.6);
    if (bloq) {
      Array.prototype.forEach.call(ic.querySelectorAll('path'), function (p) {
        if (p.getAttribute('stroke')) p.setAttribute('stroke', tinta);
        else if (p.getAttribute('fill') === TINTA) p.setAttribute('fill', tinta);
        else if (p.getAttribute('fill')) p.setAttribute('fill', '#8E8D96');
      });
    }
    svg.appendChild(ic);
    var ls = quebrarTitulo(curso.titulo);
    var tam = ls.length === 1 ? 46 : ls.length === 2 ? 40 : 32;
    var alt = Math.round(tam * 1.08);
    var y0 = 214 - ((ls.length - 1) * alt) / 2;
    var t = mk(doc, 'text', { class: 'ficha-titulo', x: '160', y: String(Math.round(y0)), 'text-anchor': 'middle', fill: tinta, 'font-size': String(tam), 'font-family': sans, 'font-weight': '400', 'letter-spacing': '-0.5', 'data-largura-max': '252' });
    ls.forEach(function (l, i) { t.appendChild(mk(doc, 'tspan', { x: '160', dy: i ? String(alt) : '0' }, l)); });
    svg.appendChild(t);
    return svg;
  }

  /** Centra cada ícone pela caixa que ele ocupa e reduz os textos longos até caberem. Chamar com o SVG já no documento. */
  function alinhar(root) {
    var icones = root.querySelectorAll('.selo-icone:not([data-alinhado])');
    Array.prototype.forEach.call(icones, function (g) {
      var forma = g.querySelector('.selo-icone-forma');
      var bb;
      try { bb = forma.getBBox(); } catch (e) { bb = null; }
      if (!bb || !bb.width || !bb.height) return;
      var lado = Number(g.getAttribute('data-lado'));
      var traco = Number(g.getAttribute('data-traco'));
      var k = lado / Math.max(bb.width, bb.height);
      forma.setAttribute('transform', 'scale(' + k.toFixed(4) + ') translate(' + (-(bb.x + bb.width / 2)).toFixed(2) + ' ' + (-(bb.y + bb.height / 2)).toFixed(2) + ')');
      Array.prototype.forEach.call(forma.querySelectorAll('.selo-traco'), function (p) { p.setAttribute('stroke-width', (traco / k).toFixed(2)); });
      g.setAttribute('data-alinhado', '');
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-largura-max]'), function (t) { ajustarLargura(t); });
  }

  function ajustarLargura(t) {
    var max = Number(t.getAttribute('data-largura-max'));
    var largura;
    try { largura = t.getBBox().width; } catch (e) { return; }
    if (!largura || largura <= max) return;
    var tam = Number(t.getAttribute('font-size'));
    t.setAttribute('font-size', String(Math.floor((tam * max) / largura)));
  }

  /** Serializa o SVG para um arquivo autônomo. */
  function serializar(svg) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg) + '\n';
  }

  return {
    MATERIA: MATERIA, GEOMETRIA: { W: W, H: H, CX: CX, CY: CY, RAIO: RAIO, ARCO: ARCO, ICONE: ICONE, TITULO: TITULO },
    poligono: poligono, linhas: linhas, dataLonga: dataLonga,
    miniatura: miniatura, completo: completo, ficha: ficha, quebrarTitulo: quebrarTitulo, alinhar: alinhar, ajustarLargura: ajustarLargura, serializar: serializar,
  };
});
