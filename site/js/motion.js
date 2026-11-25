/* R2S Lab — sistema de movimento do ponto laranja (landing).
 * Linguagem: um único ponto laranja liga as cenas; molas com pequeno exagero, nada de gradiente, brilho ou
 * partícula; cada movimento nasce de um elemento que já está na tela.
 * Técnica: cada cena calcula TUDO a partir do tempo em seek(t), com molas de forma fechada (o gráfico e o
 * ponto usam a mesma função). Sem movimento permitido, a cena mostra direto o quadro final.
 * Cenas nos cards das quatro regras (data-cena) e contagem com mola nos números. */

const NS = 'http://www.w3.org/2000/svg';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;

/** Resposta de mola amortecida a um degrau (0 → 1), em segundos. z < 1 dá o pequeno exagero. */
export function spring(t, z = 0.42, w = 13) {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

function mk(parent, tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  parent.appendChild(n);
  return n;
}
const set = (n, attrs) => { for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, typeof v === 'number' ? v.toFixed(2) : String(v)); };
const ver = (n, p) => { n.style.opacity = String(clamp(p)); };

/** chip laranja que entra com mola de escala */
function chip(svg, x, y, texto, largura) {
  const g = mk(svg, 'g', { class: 'mo-chip' });
  mk(g, 'rect', { x, y, width: largura, height: 20, rx: 10 });
  mk(g, 'text', { x: x + largura / 2, y: y + 14, 'text-anchor': 'middle' }, texto);
  return (p) => {
    const s = spring(p);
    ver(g, p > 0 ? 1 : 0);
    set(g, { transform: `translate(${x + largura / 2} ${y + 10}) scale(${Math.max(0, s)}) translate(${-(x + largura / 2)} ${-(y + 10)})` });
  };
}

/* 1. Prove o valor: o ponto desenha a resposta de mola, passa da linha de 3× o custo e assenta acima dela. */
function cenaValor(svg) {
  const X0 = 16, X1 = 248, BASE = 100, ALVO = 32, LIMIAR = 54;
  mk(svg, 'path', { class: 'mo-linha', d: `M${X0} ${BASE}H${X1 + 16}` });
  mk(svg, 'path', { class: 'mo-alvo', d: `M${X0} ${LIMIAR}H${X1 + 16}` });
  mk(svg, 'text', { x: X1 + 16, y: LIMIAR + 14, 'text-anchor': 'end' }, '3× o custo');
  mk(svg, 'text', { x: X0, y: BASE + 15 }, 'valor anual');
  const curva = mk(svg, 'path', { class: 'mo-curva' });
  const ponto = mk(svg, 'circle', { class: 'mo-dot', r: 5 });
  const c = chip(svg, X1 - 82, 4, 'passa no G1', 82);
  const y = (p) => BASE - (BASE - ALVO) * spring(p * 1.5);
  return {
    dur: 3.2,
    seek(t) {
      const p = seg(t, 0.25, 2.1);
      let d = `M${X0} ${BASE}`;
      for (let i = 1; i <= 64; i++) { const q = (p * i) / 64; d += `L${lerp(X0, X1, q).toFixed(1)} ${y(q).toFixed(1)}`; }
      set(curva, { d });
      const r = 5 * spring(seg(t, 0, 0.5) * 0.9);
      set(ponto, { cx: lerp(X0, X1, p), cy: y(p), r: Math.max(0, r) });
      c(seg(t, 2.1, 3.1));
    },
  };
}

/* 2. Escolha o mais barato: as barras de custo sobem; o ponto salta de Agente até Regra/SQL e acende a barra. */
function cenaBarato(svg) {
  const NOMES = ['Regra / SQL', 'ML', 'LLM', 'Agente'];
  const CX = [36, 104, 172, 240], H = [14, 28, 44, 62], BASE = 92;
  const barras = NOMES.map((nome, i) => {
    mk(svg, 'text', { x: CX[i], y: BASE + 16, 'text-anchor': 'middle' }, nome);
    return mk(svg, 'rect', { class: 'mo-barra', x: CX[i] - 18, width: 36, rx: 4 });
  });
  const ponto = mk(svg, 'circle', { class: 'mo-dot', r: 5 });
  const legenda = mk(svg, 'text', { class: 'mo-ink', x: 14, y: 12 }, 'o mais barato que funciona');
  const topo = (i) => BASE - H[i] - 7;
  const T0 = 0.95, HOP = 0.42;
  return {
    dur: 3.4,
    seek(t) {
      barras.forEach((b, i) => {
        const h = H[i] * Math.max(0, spring(t - 0.1 - i * 0.1));
        set(b, { y: BASE - h, height: h });
        b.classList.toggle('on', i === 0 && t >= T0 + 3 * HOP);
      });
      let x = CX[3], y = topo(3);
      const k = Math.floor((t - T0) / HOP);
      if (t >= T0 && k < 3) {
        const u = (t - T0 - k * HOP) / HOP, a = 3 - k, b = 2 - k;
        x = lerp(CX[a], CX[b], u);
        y = lerp(topo(a), topo(b), u) - 26 * Math.sin(Math.PI * u);
      } else if (k >= 3) {
        x = CX[0];
        y = topo(0) - 6 * (1 - spring(t - T0 - 3 * HOP)); // assenta com um pequeno quique
      }
      set(ponto, { cx: x, cy: y, r: Math.max(0, 5 * spring(seg(t, 0.4, 0.9) * 0.9)) });
      ver(legenda, seg(t, T0 + 3 * HOP + 0.1, T0 + 3 * HOP + 0.5));
    },
  };
}

/* 3. Meça: o ponto varre o golden set; cada caso cresce quando o ponto passa e fica como acerto ou falha. */
function cenaMedir(svg) {
  const COLS = 14, ROWS = 4, DX = 18, X0 = 22, Y0 = 14, DY = 18;
  const FALHAS = new Set([9, 23, 38, 50]);
  const N = COLS * ROWS;
  const pos = (i) => [X0 + (i % COLS) * DX, Y0 + Math.floor(i / COLS) * DY];
  const dots = Array.from({ length: N }, (_, i) => { const [cx, cy] = pos(i); return mk(svg, 'circle', { cx, cy, r: 2, class: 'mo-caso' }); });
  const ponto = mk(svg, 'circle', { class: 'mo-dot', r: 5 });
  const acerto = mk(svg, 'text', { class: 'mo-ink', x: X0 - 4, y: 104 }, '');
  const custo = mk(svg, 'text', { x: X0 + (COLS - 1) * DX + 4, y: 104, 'text-anchor': 'end' }, 'R$ 0,04 por transação');
  return {
    dur: 3.6,
    seek(t) {
      const f = seg(t, 0.2, 2.7) * (N - 1);
      const i0 = Math.floor(f), u = f - i0;
      const [ax, ay] = pos(i0), [bx, by] = pos(Math.min(N - 1, i0 + 1));
      const px = Math.floor(i0 / COLS) === Math.floor((i0 + 1) / COLS) ? lerp(ax, bx, u) : ax;
      const py = Math.floor(i0 / COLS) === Math.floor((i0 + 1) / COLS) ? ay : lerp(ay, by, u);
      let passou = 0, ok = 0;
      dots.forEach((d, i) => {
        const [cx, cy] = pos(i);
        const dist2 = (cx - px) ** 2 + (cy - py) ** 2;
        const feito = t > 0.2 && i <= f;
        if (feito) { passou++; if (!FALHAS.has(i)) ok++; }
        d.setAttribute('class', feito ? (FALHAS.has(i) ? 'mo-falha' : 'mo-ok') : 'mo-caso');
        set(d, { r: (feito ? 3 : 2) + 3 * Math.exp(-dist2 / 90) * (t < 2.8 ? 1 : 0) });
      });
      set(ponto, { cx: px, cy: py, r: Math.max(0, 5 * spring(seg(t, 0, 0.5) * 0.9)) * (1 - seg(t, 2.8, 3.1)) });
      acerto.textContent = passou ? `acerto ${Math.round((ok / passou) * 100)}%` : 'golden set';
      ver(custo, seg(t, 2.8, 3.3));
    },
  };
}

/* 4. Proteja: o ponto cresce em círculo, gira como quadrado e se estica na pílula do responsável. */
function cenaProteger(svg) {
  const CX = 140, CY = 44;
  const forma = mk(svg, 'rect', { class: 'mo-forma' });
  const texto = mk(svg, 'text', { class: 'mo-forma-txt', x: CX, y: CY + 4.5, 'text-anchor': 'middle' }, '1 responsável nomeado');
  const itens = [['avaliação de impacto', 22], ['red-team', 188]].map(([t, x]) => {
    const g = mk(svg, 'g');
    mk(g, 'circle', { class: 'mo-dot', cx: x, cy: 96, r: 3.5 });
    mk(g, 'text', { class: 'mo-ink', x: x + 9, y: 100 }, t);
    return g;
  });
  return {
    dur: 3.4,
    seek(t) {
      const g = spring(seg(t, 0.05, 1) * 0.9);            // ponto → círculo
      const q = spring(Math.max(0, t - 0.75));            // círculo → quadrado girando
      const s = spring(Math.max(0, t - 1.55));            // quadrado → pílula
      const lado = lerp(10, 48, g);
      const w = lerp(lado, 186, s), h = lerp(lado, 32, s);
      const rx = lerp(lerp(lado / 2, 9, clamp(q)), 16, clamp(s));
      const rot = s > 0 ? 0 : 90 * q; // um quadrado a 90° é igual a 0°: a pílula nasce reta, sem salto visível
      set(forma, { x: CX - w / 2, y: CY - h / 2, width: Math.max(0, w), height: Math.max(0, h), rx: Math.max(0, rx), transform: `rotate(${rot.toFixed(2)} ${CX} ${CY})` });
      ver(texto, seg(t, 2.05, 2.35));
      itens.forEach((it, i) => ver(it, seg(t, 2.4 + i * 0.25, 2.7 + i * 0.25)));
    },
  };
}

export const CENAS = { valor: cenaValor, barato: cenaBarato, medir: cenaMedir, proteger: cenaProteger };

/** Monta a cena no card; com movimento, toca ao entrar na tela e de novo ao passar o mouse. */
export function montarCena(card, animar, observar) {
  const tipo = card.dataset.cena;
  if (!CENAS[tipo] || card.querySelector('svg.mo')) return null;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 280 116');
  svg.setAttribute('class', 'mo');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  card.insertBefore(svg, card.firstChild);
  const cena = CENAS[tipo](svg);
  if (!animar) { cena.seek(cena.dur); svg.dataset.estado = 'final'; return cena; }
  cena.seek(0);
  let raf = 0;
  const tocar = () => {
    cancelAnimationFrame(raf);
    const inicio = performance.now();
    svg.dataset.estado = 'tocando';
    const quadro = (agora) => {
      const t = (agora - inicio) / 1000;
      cena.seek(Math.min(t, cena.dur));
      if (t < cena.dur) raf = requestAnimationFrame(quadro); else svg.dataset.estado = 'final';
    };
    raf = requestAnimationFrame(quadro);
  };
  observar(card, tocar);
  card.addEventListener('mouseenter', () => { if (svg.dataset.estado === 'final') tocar(); });
  return cena;
}

/** Contagem com mola: 0 → valor, mantendo o sufixo ("8 h"). */
export function contar(el, animar, observar) {
  const m = /^(\d+)(.*)$/.exec(el.textContent.trim());
  if (!m) return;
  const alvo = Number(m[1]), resto = m[2];
  if (!animar) return;
  el.textContent = '0' + resto;
  observar(el, () => {
    const inicio = performance.now();
    const quadro = (agora) => {
      const t = (agora - inicio) / 1000;
      const v = t >= 1.4 ? alvo : Math.max(0, Math.round(alvo * spring(t, 0.55, 9)));
      el.textContent = v + resto;
      if (t < 1.4) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  });
}

export function enableMotion(doc = document) {
  const animar = window.matchMedia('(prefers-reduced-motion: no-preference)').matches && 'IntersectionObserver' in window;
  const io = animar ? new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); const f = e.target.__tocar; if (f) f(); } });
  }, { threshold: 0.35 }) : null;
  const observar = (el, fn) => { el.__tocar = fn; io.observe(el); };
  doc.querySelectorAll('[data-cena]').forEach((card) => montarCena(card, animar, observar));
  doc.querySelectorAll('.numeros .n, .levar .num').forEach((el) => contar(el, animar, observar));
}
