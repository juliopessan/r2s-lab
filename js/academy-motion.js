/* R2S Academy · camada de motion e ilustração (carregar depois de academy.js).
 * Só acrescenta: placa orgânica nas capas, ilustração do hero, revelação por scroll,
 * barra de leitura, âncoras nos títulos e celebração ao concluir. Sem dependências. */
(function () {
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var blobN = 0;

  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* placa orgânica facetada, no modelo do pictograma do Claude Academy */
  function blobSvg(seed) {
    var r = rng(seed * 7919 + 13), n = 11, pts = [], i, a, rad;
    for (i = 0; i < n; i++) {
      a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.18;
      rad = (44 + r() * 15) * 1.4;
      pts.push((100 + Math.cos(a) * rad).toFixed(1) + ',' + (100 + Math.sin(a) * rad).toFixed(1));
    }
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('class', 'm-blob');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', pts.join(' '));
    poly.style.setProperty('--i', String(seed % 6));
    svg.appendChild(poly);
    return svg;
  }

  function addBlobs(root) {
    var caps = root.querySelectorAll('.curso-capa:not([data-m])');
    for (var i = 0; i < caps.length; i++) {
      caps[i].setAttribute('data-m', '1');
      caps[i].insertBefore(blobSvg(++blobN), caps[i].firstChild);
    }
  }

  /* ilustração do hero: o modelo prevê o próximo token (tema da lição 1) */
  function heroArt() {
    var hero = document.querySelector('.pagina-home .hero');
    if (!hero || hero.querySelector('.m-hero-art')) return;
    var chips = [['O', 24, 30], ['modelo', 62, 66], ['prevê', 136, 58], ['o', 202, 30], ['próximo', 240, 74]];
    var s = '<svg class="m-hero-art" viewBox="0 0 360 262" role="presentation" aria-hidden="true" focusable="false">' +
      '<rect class="m-p" x="1" y="1" width="358" height="260" rx="16"/>';
    chips.forEach(function (c, i) {
      s += '<g class="m-chip" style="--i:' + i + '"><rect x="' + c[1] + '" y="24" width="' + c[2] + '" height="30" rx="8"/>' +
        '<text x="' + (c[1] + c[2] / 2) + '" y="43.5" text-anchor="middle">' + c[0] + '</text></g>';
    });
    s += '<rect class="m-caret" x="322" y="29" width="3" height="20" rx="1.5"/>' +
      '<path class="m-link" d="M277 56 V92 H112"/>' +
      '<text class="m-lbl" x="24" y="88">Próximo token provável</text>';
    [['token', 62, 112], ['passo', 24, 43], ['ponto', 9, 16]].forEach(function (c, i) {
      var y = 108 + i * 34;
      s += '<text class="m-lbl m-cand" style="--i:' + i + '" x="24" y="' + (y + 10) + '">' + c[0] + '</text>' +
        '<rect class="m-trk" x="82" y="' + y + '" width="190" height="12" rx="6"/>' +
        '<rect class="m-fill m-bar' + (i === 0 ? ' top' : '') + '" style="--i:' + i + '" x="82" y="' + y + '" width="' + Math.round(c[1] * 1.9) + '" height="12" rx="6"/>' +
        '<text class="m-pct" style="--i:' + i + '" x="282" y="' + (y + 10) + '">' + c[1] + '%</text>';
    });
    s += '<line x1="24" y1="222" x2="336" y2="222" stroke="var(--line)"/>' +
      '<text class="m-lbl" x="24" y="243">custo = tokens de entrada + tokens de saída</text></svg>';
    /* Texto fixo, sem dado de ninguém; vira SVG pelo DOMParser (as páginas da Academy não usam innerHTML). */
    var doc = new DOMParser().parseFromString(s.replace('<svg ', '<svg xmlns="' + NS + '" '), 'image/svg+xml');
    hero.appendChild(document.importNode(doc.documentElement, true));
  }

  /* revelação por scroll, com atraso escalonado entre irmãos que aparecem juntos */
  var SEL = 'main section>h2,main section>.muted,.cursos>li,.temas>li,.selos>li,.caminho>li,li.licao,' +
    '.conteudo-licao>*,.licao-nav>*,.selo-painel,.arte-selo';
  var io = null;

  function setupReveal() {
    if (RM || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('m-on');
    io = new IntersectionObserver(function (entries) {
      var vis = entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
      vis.forEach(function (e, i) {
        e.target.style.setProperty('--md', Math.min(i, 6) * 60 + 'ms');
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  }

  function scanReveal(root) {
    if (!io) return;
    var els = root.querySelectorAll(SEL);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.classList.contains('mrev') || el.closest('.hero') || el.classList.contains('rise')) continue;
      el.classList.add('mrev');
      io.observe(el);
    }
  }

  /* barra de leitura na lição */
  function readingBar() {
    if (!document.querySelector('.pagina-licao')) return;
    var bar = document.createElement('div');
    bar.className = 'm-leitura';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var tick = false;
    function upd() {
      tick = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0).toFixed(4) + ')';
    }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* âncora copiável nos títulos das seções (os mesmos do sumário) */
  function anchors(root) {
    var hs = root.querySelectorAll('.conteudo-licao .secao > h2:not([data-m])');
    for (var i = 0; i < hs.length; i++) {
      if (!hs[i].id) {
        var base = hs[i].textContent.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'secao';
        var id = base, n = 2;
        while (document.getElementById(id)) id = base + '-' + n++;
        hs[i].id = id;
      }
      hs[i].setAttribute('data-m', '1');
      var a = document.createElement('a');
      a.className = 'm-ancora';
      a.href = '#' + hs[i].id;
      a.setAttribute('aria-label', 'Link para esta seção');
      a.textContent = '#';
      hs[i].insertBefore(a, hs[i].firstChild);
    }
  }

  /* celebração ao concluir: estrelas saem do botão */
  function burst(btn) {
    if (RM || !btn.animate) return;
    var rc = btn.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
    for (var i = 0; i < 12; i++) {
      var st = document.createElementNS(NS, 'svg');
      st.setAttribute('viewBox', '0 0 24 24');
      st.setAttribute('width', String(8 + (i % 3) * 3));
      st.setAttribute('height', String(8 + (i % 3) * 3));
      st.setAttribute('class', 'm-estrela');
      st.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M12 2l2.2 6.8L21 9.5l-5.4 4.3 1.9 6.9L12 16.9 6.5 20.7l1.9-6.9L3 9.5l6.8-.7z');
      st.appendChild(p);
      if (i % 4 === 3) st.style.fill = 'var(--ok)';
      document.body.appendChild(st);
      var ang = (i / 12) * Math.PI * 2 + (i % 2) * 0.2, dist = 44 + (i % 4) * 14;
      var anim = st.animate([
        { transform: 'translate(' + cx + 'px,' + cy + 'px) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + (cx + Math.cos(ang) * dist) + 'px,' + (cy + Math.sin(ang) * dist) + 'px) scale(1) rotate(160deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (cx + Math.cos(ang) * dist * 1.2) + 'px,' + (cy + Math.sin(ang) * dist * 1.2 + 14) + 'px) scale(.3) rotate(240deg)', opacity: 0 }
      ], { duration: 760, easing: 'cubic-bezier(.165,.84,.44,1)', fill: 'forwards' });
      anim.onfinish = (function (n) { return function () { n.remove(); }; })(st);
    }
  }

  function watchConcluir() {
    var btn = document.getElementById('concluir');
    if (!btn) return;
    var antes = btn.getAttribute('aria-pressed');
    new MutationObserver(function () {
      var agora = btn.getAttribute('aria-pressed');
      if (agora === 'true' && antes !== 'true') burst(btn);
      antes = agora;
    }).observe(btn, { attributes: true, attributeFilter: ['aria-pressed'] });
  }

  function themeToggle() {
    var t = document.getElementById('tema-toggle');
    if (!t || RM) return;
    t.addEventListener('click', function () {
      var h = document.documentElement;
      h.classList.add('m-tema');
      setTimeout(function () { h.classList.remove('m-tema'); }, 450);
    });
  }

  function enhance(root) { addBlobs(root); anchors(root); scanReveal(root); }

  function init() {
    setupReveal();
    heroArt();
    enhance(document);
    readingBar();
    watchConcluir();
    themeToggle();
    var main = document.querySelector('main');
    if (main) {
      var pend = false;
      new MutationObserver(function () {
        if (pend) return;
        pend = true;
        requestAnimationFrame(function () { pend = false; enhance(main); });
      }).observe(main, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
