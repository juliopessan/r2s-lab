import { GITHUB_ORG } from './config.js';
import { enableMotion } from './motion.js';

const ORG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
function el(tag, props = {}, text) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Links to the lab template when an organization is configured; keeps the notice otherwise.
 * Participants never clone the shared template: each creates a private repo from it.
 */
export function renderStart(org) {
  const status = document.querySelector('#clone-status');
  if (!status || !ORG_PATTERN.test(org || '')) return;

  const link = el(
    'a',
    { id: 'template-link', className: 'button', href: `https://github.com/${org}/r2s-lab` },
    'Abrir o template do laboratório',
  );
  const hint = el(
    'p',
    { className: 'support template-hint' },
    'No GitHub, use o botão "Use this template", escolha "Private" e dê ao repositório o nome r2s-lab- seguido do seu usuário do GitHub.',
  );
  const guia = el('p', { className: 'support template-guia' });
  guia.append('Passo a passo completo, com os comandos: ', el('a', { href: `https://github.com/${org}/r2s-lab#comece-aqui` }, 'instalação no README'), '.');
  const block = el('div', { className: 'template' });
  block.append(link, hint, guia);
  status.replaceWith(block);
}

/** Progressive enhancement: fades beats in as they scroll into view, only when motion is welcome. */
export function enableReveal() {
  const calm = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (!calm || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('reveal-ready');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

enableReveal();
enableMotion();
renderStart(typeof window.__R2S_ORG__ === 'string' ? window.__R2S_ORG__ : GITHUB_ORG);
