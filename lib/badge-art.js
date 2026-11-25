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
  var TINTA = '#333333'; // Avanade Grey 80
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
   * e o ícone de traço. A cor codifica a FAMÍLIA, não o curso: o pre-work é Glow (o laranja Avanade) e a
   * jornada da squad percorre a família de gradientes nomeados, de Solar (G0) a Aurora (G4).
   * `a` e `b` são formas fechadas; a interseção delas é preenchida com a cor de destaque. */
  var MATERIA = {
    p1: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600', // conversa com o modelo
      a: 'M40 14c15 0 27 10 27 23s-12 23-27 23c-4 0-7-1-10-2l-14 6 4-12c-4-4-7-9-7-15 0-13 12-23 27-23z',
      b: 'M62 40c13 0 24 9 24 20 0 5-2 10-6 13l4 11-13-5c-3 1-6 1-9 1-13 0-24-9-24-20s11-20 24-20z', extra: '' },
    p2: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600', // lupa sobre o alvo
      a: 'M40 16a24 24 0 1 1 0 48a24 24 0 1 1 0-48z',
      b: 'M64 34a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M57 57L78 78M64 48a6 6 0 1 1 0 12a6 6 0 1 1 0-12z' },
    p3: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600', // duas moedas
      a: 'M40 20a24 24 0 1 1 0 48a24 24 0 1 1 0-48z',
      b: 'M62 34a24 24 0 1 1 0 48a24 24 0 1 1 0-48z', extra: 'M30 44h20M30 52h14' },
    p4: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600', // escudo e a pessoa que responde
      a: 'M50 12l30 12v24c0 20-13 32-30 38-17-6-30-18-30-38V24z',
      b: 'M50 32a12 12 0 1 1 0 24a12 12 0 1 1 0-24z', extra: 'M32 70c4-8 11-12 18-12s14 4 18 12' },
    p5: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600', // documento com o visto
      a: 'M22 12h34l18 18v58H22z',
      b: 'M70 54a18 18 0 1 1 0 36a18 18 0 1 1 0-36z', extra: 'M56 12v18h18M32 44h26M32 56h18M62 72l6 6 11-12' },
    s1: { fundo: '#FFD700', papel: '#FFF6CC', rodape: '#333333', destaque: '#7A5C00', // intake: a bandeja que recebe o caso
      a: 'M14 52h22l6 10h16l6-10h22v30H14z',
      b: 'M50 16a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M50 26v18M42 37l8 8 8-8' },
    s2: { fundo: '#FFB414', papel: '#FFEDC7', rodape: '#333333', destaque: '#7A4E00', // discover: duas pessoas que se escutam
      a: 'M36 22a16 16 0 1 1 0 32a16 16 0 1 1 0-32z',
      b: 'M64 22a16 16 0 1 1 0 32a16 16 0 1 1 0-32z', extra: 'M14 84c3-14 12-22 22-22s19 8 22 22M42 84c3-14 12-22 22-22s19 8 22 22' },
    s3: { fundo: '#FF5800', papel: '#FFE0CC', rodape: '#FFFFFF', destaque: '#DC4600', // frame value: a etiqueta de valor e a moeda
      a: 'M16 20h34l34 34-30 30-38-38z',
      b: 'M66 54a18 18 0 1 1 0 36a18 18 0 1 1 0-36z', extra: 'M32 34a5 5 0 1 1 0.1 0' },
    s4: { fundo: '#B43C14', papel: '#F3D9CF', rodape: '#FFFFFF', destaque: '#B43C14', // design: duas opções lado a lado
      a: 'M14 22h42v42H14z',
      b: 'M44 36h42v42H44z', extra: 'M56 57l6 6 12-13' },
    s5: { fundo: '#C80000', papel: '#F6D1D1', rodape: '#FFFFFF', destaque: '#C80000', // evaluate: a prancheta e a medida
      a: 'M24 18h40v66H24z',
      b: 'M66 50a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M36 14h16v8H36zM32 38h24M32 50h16M66 58v12l8 6' },
    s6: { fundo: '#890078', papel: '#EED2EA', rodape: '#FFFFFF', destaque: '#890078', // pitch: a tela e o foco da decisão
      a: 'M12 20h60v40H12z',
      b: 'M66 44a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M42 60v14M30 80h24M58 64l6 6 10-11' },
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
    var clipId = 'r2s-clip-' + id + '-' + (uid++);
    var g = mk(doc, 'g', { class: 'selo-icone', transform: 'translate(' + cx + ' ' + cy + ')', 'data-lado': String(lado), 'data-traco': String(traco) });
    var forma = mk(doc, 'g', { class: 'selo-icone-forma', transform: 'scale(' + (lado / 100) + ') translate(-50 -50)' });
    var defs = mk(doc, 'defs');
    var clip = mk(doc, 'clipPath', { id: clipId });
    clip.appendChild(mk(doc, 'path', { d: m.a }));
    defs.appendChild(clip);
    forma.appendChild(defs);
    forma.appendChild(mk(doc, 'path', { d: m.b, fill: m.destaque, 'clip-path': 'url(#' + clipId + ')' }));
    [m.a, m.b, m.extra].forEach(function (d) {
      if (d) forma.appendChild(mk(doc, 'path', { d: d, fill: 'none', stroke: TINTA, 'stroke-width': String((traco * 100) / lado), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'selo-traco' }));
    });
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

    var serif = sans; // Avanade: Segoe UI em tudo; títulos em Light (300)
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
    var ic = icone(doc, curso.id, 160, 84, 50, 2.2);
    if (bloq) {
      Array.prototype.forEach.call(ic.querySelectorAll('path'), function (p) {
        if (p.getAttribute('stroke')) p.setAttribute('stroke', tinta);
        else p.setAttribute('fill', '#8E8D96');
      });
    }
    svg.appendChild(ic);
    var ls = quebrarTitulo(curso.titulo);
    var tam = ls.length === 1 ? 46 : ls.length === 2 ? 40 : 32;
    var alt = Math.round(tam * 1.08);
    var y0 = 182 - ((ls.length - 1) * alt) / 2;
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
