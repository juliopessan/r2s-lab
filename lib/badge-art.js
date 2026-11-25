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
  var TINTA = '#191A1D';

  /* Geometria do selo completo, medida no PDF de referência (1100 × 750). */
  var W = 1100;
  var H = 750;
  var CX = 550;
  var CY = 372;
  var RAIO = 318;
  var ARCO = { cx: 550, cy: 402, r: 252 };
  var ICONE = { cx: 550, cy: 244, lado: 118 };
  var TITULO = { y1: 440, y2a: 404, larguraMax: 500 };

  /* Cada matéria: fundo de cor cheia, papel claro do polígono e o ícone de traço.
   * `a` e `b` são formas fechadas; a interseção delas é preenchida com a cor do fundo, como no modelo. */
  var MATERIA = {
    p1: { fundo: '#5F927E', papel: '#D6E6DE', // conversa com o modelo
      a: 'M40 14c15 0 27 10 27 23s-12 23-27 23c-4 0-7-1-10-2l-14 6 4-12c-4-4-7-9-7-15 0-13 12-23 27-23z',
      b: 'M62 40c13 0 24 9 24 20 0 5-2 10-6 13l4 11-13-5c-3 1-6 1-9 1-13 0-24-9-24-20s11-20 24-20z', extra: '' },
    p2: { fundo: '#7A73B3', papel: '#DEDBF0', // lupa sobre o alvo
      a: 'M40 16a24 24 0 1 1 0 48a24 24 0 1 1 0-48z',
      b: 'M64 34a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M57 57L78 78M64 48a6 6 0 1 1 0 12a6 6 0 1 1 0-12z' },
    p3: { fundo: '#D97757', papel: '#F1CDBC', // duas moedas
      a: 'M40 20a24 24 0 1 1 0 48a24 24 0 1 1 0-48z',
      b: 'M62 34a24 24 0 1 1 0 48a24 24 0 1 1 0-48z', extra: 'M30 44h20M30 52h14' },
    p4: { fundo: '#5A80AD', papel: '#D5E1EF', // escudo e a pessoa que responde
      a: 'M50 12l30 12v24c0 20-13 32-30 38-17-6-30-18-30-38V24z',
      b: 'M50 32a12 12 0 1 1 0 24a12 12 0 1 1 0-24z', extra: 'M32 70c4-8 11-12 18-12s14 4 18 12' },
    p5: { fundo: '#C0953A', papel: '#F0E2BF', // documento com o visto
      a: 'M22 12h34l18 18v58H22z',
      b: 'M70 54a18 18 0 1 1 0 36a18 18 0 1 1 0-36z', extra: 'M56 12v18h18M32 44h26M32 56h18M62 72l6 6 11-12' },
    s1: { fundo: '#3E8789', papel: '#CDE5E5', // intake: a bandeja que recebe o caso
      a: 'M14 52h22l6 10h16l6-10h22v30H14z',
      b: 'M50 16a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M50 26v18M42 37l8 8 8-8' },
    s2: { fundo: '#B0607A', papel: '#F1D4DD', // discover: duas pessoas que se escutam
      a: 'M36 22a16 16 0 1 1 0 32a16 16 0 1 1 0-32z',
      b: 'M64 22a16 16 0 1 1 0 32a16 16 0 1 1 0-32z', extra: 'M14 84c3-14 12-22 22-22s19 8 22 22M42 84c3-14 12-22 22-22s19 8 22 22' },
    s3: { fundo: '#7A8838', papel: '#E3E8C6', // frame value: a etiqueta de valor e a moeda
      a: 'M16 20h34l34 34-30 30-38-38z',
      b: 'M66 54a18 18 0 1 1 0 36a18 18 0 1 1 0-36z', extra: 'M32 34a5 5 0 1 1 0.1 0' },
    s4: { fundo: '#4E5DA4', papel: '#D7DBF1', // design: duas opções lado a lado
      a: 'M14 22h42v42H14z',
      b: 'M44 36h42v42H44z', extra: 'M56 57l6 6 12-13' },
    s5: { fundo: '#A65A3D', papel: '#EFD3C6', // evaluate: a prancheta e a medida
      a: 'M24 18h40v66H24z',
      b: 'M66 50a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M36 14h16v8H36zM32 38h24M32 50h16M66 58v12l8 6' },
    s6: { fundo: '#7C5A8C', papel: '#E7D6ED', // pitch: a tela e o foco da decisão
      a: 'M12 20h60v40H12z',
      b: 'M66 44a20 20 0 1 1 0 40a20 20 0 1 1 0-40z', extra: 'M42 60v14M30 80h24M58 64l6 6 10-11' },
  };

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function dataLonga(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? Number(m[3]) + ' de ' + MESES[Number(m[2]) - 1] + ' de ' + m[1] : '';
  }

  /** Polígono irregular de 12 lados, sempre igual para a mesma semente (como um selo recortado à mão). */
  function poligono(seed, cx, cy, r) {
    var s = (seed * 9973) % 2147483647 || 1;
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    var n = 12;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * (i + (rnd() - 0.5) * 0.36)) / n - Math.PI / 2;
      var k = 0.955 + rnd() * 0.07;
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
    forma.appendChild(mk(doc, 'path', { d: m.b, fill: m.fundo, 'clip-path': 'url(#' + clipId + ')' }));
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
    var arco = mk(doc, 'text', { class: 'selo-arco', fill: m.fundo, 'font-size': '28', 'letter-spacing': '7', 'font-family': "'Segoe UI',system-ui,-apple-system,Arial,sans-serif", 'font-weight': '600' });
    var tp = mk(doc, 'textPath', { href: '#' + arcoId, startOffset: '50%', 'text-anchor': 'middle' }, 'SELO DE CONCLUSÃO DE CURSO');
    arco.appendChild(tp);
    svg.appendChild(arco);

    svg.appendChild(icone(doc, curso.id, ICONE.cx, ICONE.cy, ICONE.lado, 3.4));

    var serif = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Times New Roman',serif";
    var ls = linhas(curso.titulo);
    var tam = ls.length === 1 ? 96 : 68;
    var titulo = mk(doc, 'text', { id: 'selo-curso', class: 'selo-svg-titulo', x: String(CX), y: String(ls.length === 1 ? TITULO.y1 : TITULO.y2a), 'text-anchor': 'middle', fill: TINTA, 'font-size': String(tam), 'font-family': serif, 'data-largura-max': String(TITULO.larguraMax) });
    ls.forEach(function (t, i) { titulo.appendChild(mk(doc, 'tspan', { x: String(CX), dy: i ? String(Math.round(tam * 1.06)) : '0' }, t)); });
    svg.appendChild(titulo);

    if (!opcoes.semNome) {
      svg.appendChild(mk(doc, 'text', { x: String(CX), y: '532', 'text-anchor': 'middle', fill: TINTA, 'font-size': '28', 'font-family': serif }, 'Concedido a'));
      svg.appendChild(mk(doc, 'text', { id: 'selo-nome', class: 'selo-nome', x: String(CX), y: '580', 'text-anchor': 'middle', fill: TINTA, 'font-size': '40', 'font-family': serif, 'data-largura-max': '520' }, nome || 'Seu nome'));
    }

    var marca = mk(doc, 'g', { transform: 'translate(40 672)' });
    marca.appendChild(mk(doc, 'path', { d: 'M17 0l4.6 12.4 13.2.6-10.4 8.2 3.6 12.8L17 26.6 6 34l3.6-12.8L-.8 13l13.2-.6z', fill: '#FFFFFF' }));
    marca.appendChild(mk(doc, 'text', { x: '46', y: '30', fill: '#FFFFFF', 'font-size': '36', 'font-family': serif }, 'R2S Academy'));
    svg.appendChild(marca);

    if (dataIso) {
      svg.appendChild(mk(doc, 'text', { id: 'selo-data', x: String(W - 40), y: '700', 'text-anchor': 'end', fill: '#FFFFFF', 'font-size': '20', 'letter-spacing': '2', 'font-family': "'Segoe UI',system-ui,-apple-system,Arial,sans-serif", 'font-weight': '600' }, ('Emitido em ' + dataLonga(dataIso)).toUpperCase()));
    }
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
    miniatura: miniatura, completo: completo, alinhar: alinhar, ajustarLargura: ajustarLargura, serializar: serializar,
  };
});
