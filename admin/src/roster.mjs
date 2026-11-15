const ROLES = [
  'Data Engineer',
  'BI / Analytics Developer',
  'Data Scientist',
  'Data Architect',
  'ETL / DBA',
];
const REQUIRED = ['nome', 'email', 'github', 'onda', 'papel_atual', 'multiplicador'];
const TRILHAS = ['upskilling', 'reskilling'];
const HANDLE = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitLine(line, delimiter) {
  const fields = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function headerError(message) {
  return { rows: [], errors: [{ line: 1, field: 'cabecalho', message }] };
}

const UTF8_HINT = 'salve como "CSV UTF-8 (delimitado por vírgulas)" no Excel';

/** Decodes a roster file strictly as UTF-8 (the BOM is dropped); throws a pt-BR message otherwise. */
export function decodeRoster(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new Error(`o arquivo não está em UTF-8; ${UTF8_HINT}`);
  }
}

export function parseRoster(text) {
  if (String(text).includes('\uFFFD')) {
    return headerError(`o arquivo tem caracteres inválidos (\uFFFD); reexporte em UTF-8: ${UTF8_HINT}`);
  }
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
  const firstIndex = lines.findIndex((l) => l.trim() !== '');
  if (firstIndex === -1) return headerError('arquivo vazio');

  const headerLine = lines[firstIndex];
  const delimiter =
    (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
  const header = splitLine(headerLine, delimiter).map((h) => h.toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return headerError(`colunas obrigatórias ausentes: ${missing.join(', ')}`);
  }

  const rows = [];
  const errors = [];
  const seenEmail = new Set();
  const seenGithub = new Set();

  for (let i = firstIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const line = i + 1;
    const cells = splitLine(lines[i], delimiter);
    if (cells.every((c) => c === '')) continue;
    const get = (name) => (cells[header.indexOf(name)] ?? '').trim();
    const fail = (field, message) => rowErrors.push({ line, field, message });
    const rowErrors = [];

    const nome = get('nome');
    if (!nome) fail('nome', 'nome obrigatório');

    const email = get('email');
    if (!EMAIL.test(email)) fail('email', 'e-mail inválido');
    else if (seenEmail.has(email.toLowerCase())) fail('email', 'e-mail duplicado');
    seenEmail.add(email.toLowerCase());

    const github = get('github');
    if (!HANDLE.test(github)) fail('github', 'usuário do GitHub inválido');
    else if (seenGithub.has(github.toLowerCase())) fail('github', 'usuário do GitHub duplicado');
    seenGithub.add(github.toLowerCase());

    const ondaText = get('onda');
    if (!/^\d+$/.test(ondaText)) fail('onda', 'onda deve ser um inteiro maior ou igual a 0');

    const papelAtual = ROLES.find((r) => r.toLowerCase() === get('papel_atual').toLowerCase());
    if (!papelAtual) fail('papel_atual', 'papel atual desconhecido');

    const mult = get('multiplicador').toLowerCase();
    if (!['sim', 'nao', 'não'].includes(mult)) fail('multiplicador', 'multiplicador deve ser sim ou nao');

    const trilhaText = get('trilha').toLowerCase();
    if (trilhaText && !TRILHAS.includes(trilhaText)) {
      fail('trilha', 'trilha deve ser upskilling ou reskilling');
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }
    rows.push({
      nome,
      email,
      github,
      onda: Number(ondaText),
      squad: get('squad') || null,
      papelAtual,
      trilha: trilhaText || null,
      multiplicador: mult === 'sim',
    });
  }
  return { rows, errors };
}
