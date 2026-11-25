#!/usr/bin/env node
// Gera js/academy-content.js a partir de 00-prework/index.html e dos modelos squad/A–E (fontes únicas do conteúdo).
// Uso: node tools/build-academy.mjs [--check]   (--check só confere se o arquivo está em dia)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOID = new Set(['input', 'br', 'img', 'meta', 'link', 'hr']);

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');

/** Árvore mínima de elementos: suficiente para ler o markup do pre-work. */
function parse(html) {
  const root = { tag: 'root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { top.children.push({ text: m[5] }); continue; }
    if (!m[2]) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) {
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const attrs = {};
    for (const a of m[3].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] === undefined ? '' : decode(a[2]);
    const node = { tag, attrs, children: [] };
    top.children.push(node);
    if (!VOID.has(tag) && !m[4]) stack.push(node);
  }
  return root;
}

const textOf = (n) => (n.text !== undefined ? n.text : n.children.map(textOf).join(''));
const clean = (n) => decode(textOf(n)).replace(/\s+/g, ' ').trim();
const hasClass = (n, c) => n.attrs && (n.attrs.class || '').split(/\s+/).includes(c);
function find(n, pred, out = []) {
  if (n.tag && pred(n)) out.push(n);
  for (const c of n.children || []) find(c, pred, out);
  return out;
}

export function extract(html) {
  const tree = parse(html);
  const parts = [];
  for (const h2 of find(tree, (n) => n.tag === 'h2' && /^p\dh$/.test(n.attrs.id || ''))) {
    const head = find(tree, (n) => hasClass(n, 'parthead') && find(n, (x) => x === h2).length)[0];
    const section = find(tree, (n) => n.tag === 'section' && find(n, (x) => x === h2).length)[0];
    parts.push({
      part: Number(h2.attrs.id[1]),
      title: clean(h2),
      meta: clean(find(head, (n) => hasClass(n, 'pmeta'))[0]),
      goal: clean(find(section, (n) => hasClass(n, 'goal'))[0]),
    });
  }

  const lessons = {};
  for (const article of find(tree, (n) => n.tag === 'article' && hasClass(n, 'block'))) {
    const h3 = clean(find(article, (n) => n.tag === 'h3')[0]);
    const [, id, title] = /^(\d\.\d)\s+(.*)$/.exec(h3);
    const min = Number(/(\d+)/.exec(clean(find(article, (n) => hasClass(n, 'min'))[0]))[1]);
    const body = [];
    let exercise = null;
    const refs = [];
    const quizzes = [];
    let tool = false;
    for (const child of article.children) {
      if (child.tag === 'p') body.push({ type: 'p', text: clean(child) });
      else if (hasClass(child, 'tw')) {
        body.push({ type: 'table', rows: find(child, (n) => n.tag === 'tr').map((tr) => [clean(find(tr, (n) => n.tag === 'th')[0]), clean(find(tr, (n) => n.tag === 'td')[0])]) });
      } else if (hasClass(child, 'ladder')) {
        body.push({ type: 'ladder', items: find(child, (n) => n.tag === 'span').map((sp) => ({ label: clean({ children: sp.children.filter((c) => c.text !== undefined) }), cost: clean(find(sp, (n) => n.tag === 'em')[0]) })) });
      } else if (hasClass(child, 'tree')) {
        const node = (li) => ({
          text: clean({ children: li.children.filter((c) => c.text !== undefined) }),
          ai: hasClass(li, 'ai'),
          children: li.children.filter((c) => c.tag === 'ul').flatMap((ul) => ul.children.filter((c) => c.tag === 'li').map(node)),
        });
        body.push({ type: 'tree', items: child.children.filter((c) => c.tag === 'li').map(node) });
      } else if (hasClass(child, 'pitch')) {
        body.push({ type: 'pitch', label: child.attrs['aria-label'] || '', items: child.children.filter((c) => c.tag === 'div').map((d) => ({ min: Number(/flex:(\d+)/.exec(d.attrs.style || '')[1]), time: clean(find(d, (n) => n.tag === 'b')[0]), text: clean({ children: d.children.filter((c) => c.text !== undefined) }), demo: hasClass(d, 'demo') })) });
      }
      else if (hasClass(child, 'do')) exercise = { label: clean(find(child, (n) => n.tag === 'b')[0]), text: clean(find(child, (n) => n.tag === 'p')[0]) };
      else if (hasClass(child, 'tool')) tool = true;
      else if (hasClass(child, 'quiz')) quizzes.push(child.attrs['data-quiz']);
      else if (hasClass(child, 'refs')) {
        for (const li of find(child, (n) => n.tag === 'li')) {
          const a = find(li, (n) => n.tag === 'a')[0];
          const small = find(li, (n) => n.tag === 'small')[0];
          refs.push({ title: clean(a), url: a.attrs.href, note: small ? clean(small) : '' });
        }
      }
    }
    lessons[id] = { part: Number(id[0]), title, min, body, exercise, refs, quizzes, tool };
  }
  return { parts, lessons };
}

/** Campos dos modelos do dossiê (squad/A–E): título, introdução e campos por seção. */
export function extractTemplates(texts) {
  const out = {};
  for (const [key, text] of Object.entries(texts)) {
    const lines = text.split('\n');
    const head = /^#\s+[A-E]\.\s+(.*?)\s*(?:\((.*)\))?\s*$/.exec(lines[0]);
    const doc = { title: head[1], when: head[2] || '', intro: '', sections: [] };
    let current = { heading: 'Identificação', fields: [] };
    for (const raw of lines.slice(1)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('## ')) {
        if (current.fields.length) doc.sections.push(current);
        current = { heading: line.slice(3).trim(), fields: [] };
        continue;
      }
      const field = /^(?:\d+\.\s+)?(.*?):?\s*\[(preencher|opcional)\]$/.exec(line);
      if (field) current.fields.push({ label: field[1].replace(/:$/, '').trim(), optional: field[2] === 'opcional' });
      else if (!doc.intro && !line.startsWith('|') && !doc.sections.length && !current.fields.length) doc.intro = line;
    }
    if (current.fields.length) doc.sections.push(current);
    out[key] = doc;
  }
  return out;
}

const TEMPLATE_FILES = { A: 'A-case-brief.md', B: 'B-adr.md', C: 'C-pitch.md', D: 'D-sis.md', E: 'E-hearing.md' };
export function readTemplates(root = ROOT) {
  const texts = {};
  for (const [k, f] of Object.entries(TEMPLATE_FILES)) texts[k] = readFileSync(path.join(root, 'squad', f), 'utf8');
  return extractTemplates(texts);
}

export function render(content) {
  return '/* Gerado por tools/build-academy.mjs a partir de 00-prework/index.html. Não edite aqui. */\n'
    + 'window.R2S_ACADEMY = ' + JSON.stringify(content, null, 1) + ';\n';
}

export const OUT = path.join(ROOT, 'js', 'academy-content.js');
export const SOURCE = path.join(ROOT, '00-prework', 'index.html');

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const next = render({ ...extract(readFileSync(SOURCE, 'utf8')), templates: readTemplates() });
  if (process.argv.includes('--check')) {
    const same = existsSync(OUT) && readFileSync(OUT, 'utf8') === next;
    console.log(same ? 'academy-content.js está em dia.' : 'academy-content.js está desatualizado: rode node tools/build-academy.mjs');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(OUT, next);
  console.log('gerado js/academy-content.js');
}
