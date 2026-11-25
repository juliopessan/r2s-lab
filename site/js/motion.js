/* R2S Lab — sistema de movimento do ponto laranja (landing).
 * Linguagem: um único ponto laranja liga as cenas; molas com pequeno exagero, nada de gradiente, brilho ou
 * partícula; cada movimento nasce de um elemento que já está na tela.
 * Técnica: cada cena calcula TUDO a partir do tempo em seek(t), com molas de forma fechada (o gráfico e o
 * ponto usam a mesma função). Sem movimento permitido, a cena mostra direto o quadro final.
 * Cenas nos cards das quatro regras (data-cena), a corrida do ponto pelas 7 etapas e contagem com mola nos números. */

const NS = 'http://www.w3.org/2000/svg';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

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

/** Impulso amortecido: sobe e volta ao repouso com um pequeno rebote (o "pulo" de um card). */
export function impulso(t, z = 0.32, w = 16) {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return Math.exp(-z * w * t) * Math.sin(wd * t);
}

/* As 7 etapas: o ponto laranja corre pela borda de cada card. O card pula quando o ponto chega, a borda
 * enche atrás dele (laranja nos gates) e o selo do gate carimba com mola. Termina no Pitch & Hand off. */
export function montarEtapas(ol, animar, observar) {
  if (!ol || ol.dataset.mo) return null;
  ol.dataset.mo = '1';
  if (!animar) return null;
  const itens = [...ol.children];
  const partes = itens.map((li) => {
    const trilho = document.createElement('span');
    trilho.className = 'etapa-trilho' + (li.querySelector('.gate') ? ' gate-on' : '');
    trilho.setAttribute('aria-hidden', 'true');
    const ponto = document.createElement('span');
    ponto.className = 'etapa-ponto';
    ponto.setAttribute('aria-hidden', 'true');
    li.append(trilho, ponto);
    return { li, trilho, ponto, gate: li.querySelector('.gate') };
  });
  const T0 = 0.2, SLOT = 0.34;
  const dur = T0 + itens.length * SLOT + 0.9;
  const seek = (t) => {
    partes.forEach((p, i) => {
      const ti = T0 + i * SLOT;
      const u = seg(t, ti, ti + SLOT);
      p.trilho.style.transform = `scaleX(${u.toFixed(4)})`;
      const ultimo = i === partes.length - 1;
      const aqui = t >= ti && t < ti + SLOT + (ultimo ? 0.45 : 0); // no fim o ponto assenta e sai
      p.ponto.style.opacity = aqui ? '1' : '0';
      p.ponto.style.left = `calc(${(u * 100).toFixed(2)}% - 5.5px)`;
      p.ponto.style.transform = `scale(${aqui ? Math.max(0, 1 + 0.35 * impulso(t - ti, 0.4, 20)) : 0})`;
      p.li.style.transform = `translateY(${(-7 * impulso(t - ti)).toFixed(2)}px)`;
      if (p.gate) {
        const g = Math.max(0, spring(t - ti - SLOT * 0.55, 0.38, 15));
        p.gate.style.opacity = t > ti + SLOT * 0.55 ? '1' : '0';
        p.gate.style.transform = `scale(${g.toFixed(3)}) rotate(${(-14 * (1 - g)).toFixed(2)}deg)`;
      }
    });
  };
  ol.classList.add('mo-etapas');
  seek(0);
  let raf = 0, estado = 'parado';
  const tocar = () => {
    cancelAnimationFrame(raf);
    const inicio = performance.now();
    estado = 'tocando'; ol.dataset.estado = estado;
    const quadro = (agora) => {
      const t = (agora - inicio) / 1000;
      seek(Math.min(t, dur));
      if (t < dur) raf = requestAnimationFrame(quadro); else { estado = 'final'; ol.dataset.estado = estado; }
    };
    raf = requestAnimationFrame(quadro);
  };
  observar(ol, tocar);
  ol.addEventListener('mouseenter', () => { if (estado === 'final') tocar(); });
  return { seek, dur };
}

/** Toca uma linha do tempo seek(t) uma vez ao entrar na tela; de novo ao passar o mouse. */
function tocador(alvo, cena, animar, observar) {
  if (!animar) { cena.seek(cena.dur); alvo.dataset.estado = 'final'; return; }
  cena.seek(0);
  let raf = 0;
  const tocar = () => {
    cancelAnimationFrame(raf);
    const inicio = performance.now();
    alvo.dataset.estado = 'tocando';
    const quadro = (agora) => {
      const t = (agora - inicio) / 1000;
      cena.seek(Math.min(t, cena.dur));
      if (t < cena.dur) raf = requestAnimationFrame(quadro); else alvo.dataset.estado = 'final';
    };
    raf = requestAnimationFrame(quadro);
  };
  observar(alvo, tocar);
  alvo.addEventListener('mouseenter', () => { if (alvo.dataset.estado === 'final') tocar(); });
}

function letras(el) {
  const nos = [...el.childNodes];
  const out = [];
  nos.forEach((n) => {
    if (n.nodeType !== 3) return;
    const frag = document.createDocumentFragment();
    for (const ch of n.textContent) {
      const s = document.createElement('span');
      s.className = 'l';
      s.textContent = ch;
      frag.appendChild(s);
      out.push(s);
    }
    el.replaceChild(frag, n);
  });
  return out;
}

/* Chamada final: "Menos curso." chega grande, encolhe e é riscada; "Mais lab" sobe letra a letra e o
 * ponto laranja cai com mola até virar o ponto final. Saída e entrada com tempos separados. */
export function montarKin(kin, animar, observar) {
  if (!kin || kin.dataset.mo) return null;
  kin.dataset.mo = '1';
  if (!animar) { kin.dataset.estado = 'final'; return null; }
  const menos = kin.querySelector('.kin-menos'), mais = kin.querySelector('.kin-mais'), ponto = kin.querySelector('.kin-ponto');
  const lm = letras(menos), lM = letras(mais);
  const cena = {
    dur: 3.4,
    seek(t) {
      const cabe = Math.max(1, Math.min(2.2, (kin.clientWidth || 600) / Math.max(1, menos.offsetWidth)));
      lm.forEach((l, i) => {
        const p = spring(t - 0.1 - i * 0.028);
        l.style.transform = `translateY(${(0.7 * (1 - p)).toFixed(3)}em)`;
        l.style.opacity = String(clamp(p * 1.4));
      });
      const encolhe = spring(t - 1.15, 0.6, 11);
      menos.style.transform = `scale(${lerp(cabe, 1, encolhe).toFixed(3)})`;
      menos.style.setProperty('--risco', seg(t, 1.55, 1.95).toFixed(3));
      lM.forEach((l, i) => {
        const p = spring(t - 1.7 - i * 0.05, 0.45, 14);
        l.style.transform = `translateY(${(0.55 * (1 - p)).toFixed(3)}em)`;
        l.style.opacity = t < 1.7 + i * 0.05 ? '0' : String(clamp(p * 1.6));
      });
      const q = spring(t - 2.35, 0.3, 15);
      ponto.style.opacity = t < 2.35 ? '0' : '1';
      ponto.style.transform = `translateY(${(-2.2 * (1 - q)).toFixed(3)}em)`;
    },
  };
  tocador(kin, cena, animar, observar);
  return cena;
}

/* Hub dos papéis: cinco pessoas em volta da squad; a cada gate os papéis giram uma posição com mola.
 * O ponto laranja é você: a cada gate, um papel diferente. */
export function montarHub(box, animar, observar) {
  if (!box || box.dataset.mo) return null;
  box.dataset.mo = '1';
  const lista = box.parentElement.querySelector('.roles');
  const PAPEIS = lista ? [...lista.querySelectorAll('li')].map((li) => li.textContent.trim()) : [];
  if (PAPEIS.length !== 5) return null;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 520 268');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  box.appendChild(svg);
  lista.classList.add('com-hub');
  const CX = 260, CY = 124, RX = 182, RY = 96, PX = 112, PY = 56;
  const ang = (k) => -Math.PI / 2 + (k * 2 * Math.PI) / 5;
  for (let i = 0; i < 5; i++) {
    const a = ang(i);
    mk(svg, 'path', { class: 'hub-elo', d: `M${CX} ${CY}Q${CX + 0.5 * RX * Math.cos(a + 0.35)} ${CY + 0.5 * RY * Math.sin(a + 0.35)} ${CX + PX * Math.cos(a)} ${CY + PY * Math.sin(a)}` });
  }
  mk(svg, 'circle', { class: 'hub-centro', cx: CX, cy: CY, r: 32 });
  const gate = mk(svg, 'text', { class: 'hub-gate', x: CX, y: CY + 2, 'text-anchor': 'middle' }, 'G0');
  mk(svg, 'text', { class: 'hub-sub', x: CX, y: CY + 16, 'text-anchor': 'middle' }, 'squad');
  for (let i = 0; i < 5; i++) {
    const a = ang(i);
    mk(svg, 'circle', { class: 'hub-pessoa' + (i === 0 ? ' voce' : ''), cx: CX + PX * Math.cos(a), cy: CY + PY * Math.sin(a), r: i === 0 ? 7 : 5.5 });
  }
  const pilulas = PAPEIS.map((nome) => {
    const g = mk(svg, 'g', { class: 'hub-papel' });
    const w = nome.length * 7.7 + 24;
    mk(g, 'rect', { x: -w / 2, y: -13, width: w, height: 26, rx: 13 });
    mk(g, 'text', { x: 0, y: 4.5, 'text-anchor': 'middle' }, nome);
    return g;
  });
  mk(svg, 'text', { class: 'hub-legenda', x: CX, y: 262, 'text-anchor': 'middle' }, '[ você passa por mais de uma função ]');
  const PASSO = 0.95, T0 = 0.7;
  const cena = {
    dur: T0 + 4 * PASSO + 0.8,
    seek(t) {
      let k = 0, g = 0;
      for (let n = 1; n <= 4; n++) { const s = spring(t - T0 - (n - 1) * PASSO, 0.42, 12); k += s; if (s > 0.5) g = n; }
      gate.textContent = 'G' + g;
      pilulas.forEach((p, i) => {
        const a = ang(i + k);
        const x = CX + RX * Math.cos(a), y = CY + RY * Math.sin(a);
        const slot = ((Math.round(i + k) % 5) + 5) % 5;
        p.classList.toggle('on', slot === 0);
        const entra = spring(t - 0.05 - i * 0.07);
        p.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${Math.max(0, entra).toFixed(3)})`);
      });
    },
  };
  tocador(box, cena, animar, observar);
  return cena;
}

/* Marca do rodapé: o ponto laranja salta de letra em letra (R, 2, S), cada letra cede um pouco quando ele
 * pousa, e ele assenta como ponto final. Toca ao aparecer e ao passar o mouse ou focar. */
export function montarMarca(marca, animar, observar) {
  if (!marca || marca.dataset.mo) return null;
  marca.dataset.mo = '1';
  if (!animar) { marca.dataset.estado = 'final'; return null; }
  const ls = [...marca.querySelectorAll('.mr-l')], ponto = marca.querySelector('.mr-ponto');
  const HOP = 0.3, T0 = 0.15;
  const cena = {
    dur: T0 + 4 * HOP + 0.8,
    seek(t) {
      const fs = parseFloat(getComputedStyle(marca).fontSize) || 36;
      const base = ponto.offsetLeft, topo = ponto.offsetTop;
      const alvo = ls.map((l) => [l.offsetLeft + l.offsetWidth / 2 - ponto.offsetWidth / 2 - base, l.offsetTop - topo - ponto.offsetHeight - 0.04 * fs]);
      alvo.push([0, 0]);
      const k = Math.floor((t - T0) / HOP);
      let x = alvo[0][0], y = alvo[0][1] - 0.9 * fs * (1 - spring(t, 0.5, 12));
      if (t >= T0 && k < 3) {
        const u = (t - T0 - k * HOP) / HOP, a = alvo[k], b = alvo[k + 1];
        x = lerp(a[0], b[0], u);
        y = lerp(a[1], b[1], u) - 0.55 * fs * Math.sin(Math.PI * u);
      } else if (k >= 3) {
        x = 0; y = 0;
      }
      ponto.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      ls.forEach((l, i) => {
        const pouso = i === 0 ? 0.1 : T0 + (i - 1) * HOP + HOP; // quando o ponto chega nesta letra
        const d = impulso(t - pouso, 0.35, 22);
        l.style.transform = `scale(${(1 + 0.08 * d).toFixed(4)}, ${(1 - 0.12 * d).toFixed(4)})`;
      });
    },
  };
  tocador(marca, cena, animar, observar);
  marca.addEventListener('focus', () => { if (marca.dataset.estado === 'final') marca.dispatchEvent(new Event('mouseenter')); });
  return cena;
}

/* Demo day, como no teaser: a moldura se desenha, a curva de mola é traçada com o ponto laranja, a plateia
 * entra, os botões sobem e o cursor clica em Escalar, que acende. Sem movimento: o quadro final, sem cursor. */
export function montarDemo(box, animar, observar) {
  if (!box || box.dataset.mo) return null;
  box.dataset.mo = '1';
  const moldura = box.querySelector('.demo-moldura'), curva = box.querySelector('.demo-curva');
  const ponto = box.querySelector('.demo-ponto'), pessoas = [...box.querySelectorAll('.demo-pessoa')];
  const botoes = [...box.querySelectorAll('.decisions li')], cursor = box.querySelector('.demo-cursor');
  const X0 = 60, X1 = 480, BASE = 172, ALVO = 62;
  const y = (p) => BASE - (BASE - ALVO) * spring(p * 1.5, 0.38, 9);
  const PER = 2 * (516 + 200);
  set(moldura, { 'stroke-dasharray': PER });
  const cena = {
    dur: 5,
    seek(t) {
      set(moldura, { 'stroke-dashoffset': PER * (1 - ease(seg(t, 0, 0.6))) });
      const p = seg(t, 0.5, 2.3);
      let d = `M${X0} ${BASE}`;
      for (let i = 1; i <= 80; i++) { const q = (p * i) / 80; d += `L${lerp(X0, X1, q).toFixed(1)} ${y(q).toFixed(1)}`; }
      set(curva, { d });
      set(ponto, { cx: lerp(X0, X1, p), cy: y(p), r: t < 0.5 ? 0 : 6 });
      pessoas.forEach((c, i) => {
        const s = Math.max(0, spring(t - 2.2 - i * 0.12));
        set(c, { transform: `translate(${c.getAttribute('cx')} ${c.getAttribute('cy')}) scale(${s.toFixed(3)}) translate(${-c.getAttribute('cx')} ${-c.getAttribute('cy')})` });
      });
      botoes.forEach((b, i) => {
        const s = spring(t - 2.6 - i * 0.1);
        b.style.opacity = String(clamp(s * 1.5));
        b.style.transform = `translateY(${(14 * (1 - s)).toFixed(2)}px)${b === botoes[0] && t > 3.85 && t < 4.05 ? ' scale(.95)' : ''}`;
      });
      botoes[0].classList.toggle('on', t >= 3.95);
      const alvo = botoes[0];
      const ax = alvo.offsetLeft + alvo.offsetWidth * 0.55, ay = alvo.offsetTop + alvo.offsetHeight * 0.55;
      const sx = box.clientWidth - 10, sy = box.clientHeight + 10;
      const m = ease(seg(t, 3.0, 3.8));
      const cx = lerp(sx, ax, m), cy = lerp(sy, ay, m) - 40 * Math.sin(Math.PI * m) * 0.4;
      const press = t > 3.85 && t < 4.05 ? 0.85 : 1;
      cursor.style.opacity = animar && t >= 2.9 ? '1' : '0';
      cursor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) scale(${press})`;
    },
  };
  tocador(box, cena, animar, observar);
  return cena;
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
    setTimeout(() => { el.textContent = alvo + resto; }, 1600); // garante o valor final mesmo com quadros atrasados
  });
}

export function enableMotion(doc = document) {
  const animar = window.matchMedia('(prefers-reduced-motion: no-preference)').matches && 'IntersectionObserver' in window;
  const io = animar ? new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); const f = e.target.__tocar; if (f) f(); } });
  }, { threshold: 0.35 }) : null;
  const observar = (el, fn) => { el.__tocar = fn; io.observe(el); };
  doc.querySelectorAll('[data-cena]').forEach((card) => montarCena(card, animar, observar));
  montarEtapas(doc.querySelector('#como .etapas'), animar, observar);
  montarHub(doc.querySelector('[data-hub]'), animar, observar);
  montarDemo(doc.querySelector('[data-demo]'), animar, observar);
  montarKin(doc.querySelector('#final .kin'), animar, observar);
  montarMarca(doc.querySelector('.marca-r2s'), animar, observar);
  doc.querySelectorAll('.numeros .n, .levar .num').forEach((el) => contar(el, animar, observar));
}
