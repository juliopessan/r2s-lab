import { readFileSync } from 'node:fs';
import path from 'node:path';
import progress from './vendor/progress.cjs';
import squadLib from './vendor/squad.cjs';
import assessmentLib from './vendor/assessment.cjs';

const { validateProgress } = progress;
const { DOCS, DOC_FILES, validateSquad } = squadLib;
const { validateAssessment } = assessmentLib;

/**
 * FetchFile = (owner, repo, path) => Promise<{ status: number, text?: string }>
 * ProbeRepo = (owner, repo) => Promise<{ status: number }>
 *
 * Resultado de `collectProgress`:
 *   byHandle  arquivos lidos e válidos
 *   missing   o repositório existe, mas o arquivo ainda não
 *   errors    o arquivo foi lido, mas os dados são inválidos (JSON, contrato, outro usuário)
 *   unread    não deu para ler: `reason` 'api' (status ou exceção) ou 'repo' (repositório não
 *             encontrado ou sem acesso do token)
 */

/** Motivo seguro para mostrar: nunca copia a mensagem de uma exceção (ela pode conter o token). */
function safeReason(err) {
  return (err && ((err.cause && err.cause.code) || err.code || err.name)) || 'erro';
}

async function readOne(person, owner, fetchFile, probeRepo) {
  const handle = person.github.toLowerCase();
  const repo = `r2s-lab-${person.github}`;
  const invalid = (message) => ({ handle, error: { github: handle, message } });
  const unread = (reason, message) => ({ handle, unread: { github: handle, reason, message } });

  let response;
  try {
    response = await fetchFile(owner, repo, `progress/${handle}.json`);
  } catch (err) {
    return unread('api', `falha ao ler (${safeReason(err)})`);
  }

  if (response.status === 404) {
    if (!probeRepo) return { handle, missing: true };
    let probe;
    try {
      probe = await probeRepo(owner, repo);
    } catch (err) {
      return unread('api', `falha ao verificar o repositório (${safeReason(err)})`);
    }
    if (probe.status === 200) return { handle, missing: true };
    if (probe.status === 404) return unread('repo', `repositório ${repo} não encontrado ou sem acesso do token`);
    return unread('api', `falha ao verificar o repositório (status ${probe.status})`);
  }
  if (response.status !== 200) return unread('api', `falha ao ler (status ${response.status})`);

  let data;
  try {
    data = JSON.parse(response.text);
  } catch {
    return invalid('JSON inválido');
  }
  const check = validateProgress(data);
  if (!check.ok) return invalid(check.errors.join(' '));
  if (data.github.toLowerCase() !== handle) return invalid('o arquivo é de outro usuário');
  return { handle, progress: data };
}

/** Lê o arquivo de progresso de cada pessoa da lista, com no máximo `concurrency` leituras ao mesmo tempo. */
export async function collectProgress(roster, { owner, fetchFile, probeRepo, concurrency = 5 }) {
  if (!owner) throw new Error('owner não configurado');
  const outcomes = new Array(roster.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= roster.length) return;
      outcomes[i] = await readOne(roster[i], owner, fetchFile, probeRepo);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, roster.length)) }, worker));

  const result = { byHandle: {}, missing: [], errors: [], unread: [] };
  for (const outcome of outcomes) {
    if (outcome.progress) result.byHandle[outcome.handle] = outcome.progress;
    else if (outcome.missing) result.missing.push(outcome.handle);
    else if (outcome.unread) result.unread.push(outcome.unread);
    else result.errors.push(outcome.error);
  }
  return result;
}

/** Nome do repositório da squad: minúsculas, sem acentos, o resto vira hífen. */
export function squadSlug(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lê um arquivo; devolve { text } (200), { absent } (404) ou { unread } (qualquer falha). */
async function readFile(fetchFile, owner, repo, filePath) {
  let response;
  try {
    response = await fetchFile(owner, repo, filePath);
  } catch (err) {
    return { unread: { reason: 'api', message: `falha ao ler (${safeReason(err)})` } };
  }
  if (response.status === 200) return { text: response.text };
  if (response.status === 404) return { absent: true };
  return { unread: { reason: 'api', message: `falha ao ler (status ${response.status})` } };
}

async function readSquad(name, owner, fetchFile, probeRepo) {
  const repo = `r2s-lab-squad-${squadSlug(name)}`;
  const unread = (reason, message) => ({ name, unread: { squad: name, reason, message } });
  const error = (message) => ({ name, error: { squad: name, message } });

  const gatesFile = await readFile(fetchFile, owner, repo, 'squad/gates.json');
  if (gatesFile.unread) return unread(gatesFile.unread.reason, gatesFile.unread.message);
  if (gatesFile.absent) {
    if (!probeRepo) return { name, missing: true };
    let probe;
    try {
      probe = await probeRepo(owner, repo);
    } catch (err) {
      return unread('api', `falha ao verificar o repositório (${safeReason(err)})`);
    }
    if (probe.status === 200) return { name, missing: true };
    if (probe.status === 404) return unread('repo', `repositório ${repo} não encontrado ou sem acesso do token`);
    return unread('api', `falha ao verificar o repositório (status ${probe.status})`);
  }

  let gates;
  try {
    gates = JSON.parse(gatesFile.text);
  } catch {
    return error('gates.json: JSON inválido');
  }
  const check = validateSquad(gates);
  if (!check.ok) return error(`gates.json: ${check.errors.join(' ')}`);

  const assessmentFile = await readFile(fetchFile, owner, repo, 'squad/assessment.json');
  if (assessmentFile.unread) return unread(assessmentFile.unread.reason, assessmentFile.unread.message);

  const docs = {};
  for (const key of DOCS) {
    const doc = await readFile(fetchFile, owner, repo, `squad/${DOC_FILES[key]}`);
    if (doc.unread) return unread(doc.unread.reason, doc.unread.message);
    if (doc.text !== undefined) docs[key] = doc.text;
  }

  let assessment = null;
  let problem = null;
  if (assessmentFile.text !== undefined) {
    try {
      const parsed = JSON.parse(assessmentFile.text);
      const result = validateAssessment(parsed);
      if (result.ok) assessment = parsed;
      else problem = `assessment.json: ${result.errors.join(' ')}`;
    } catch {
      problem = 'assessment.json: JSON inválido';
    }
  }
  return { name, squad: { gates, assessment, docs }, problem };
}

/**
 * Lê o repositório de cada squad distinta da lista (`r2s-lab-squad-<slug>`).
 * Resultado: byName (squads lidas), missing (nomes), errors ({squad, message}), unread ({squad, reason, message}).
 */
export async function collectSquads(roster, { owner, fetchFile, probeRepo, concurrency = 5 }) {
  if (!owner) throw new Error('owner não configurado');
  const names = [];
  const seen = new Set();
  for (const person of roster) {
    const name = person.squad && String(person.squad).trim();
    if (!name) continue;
    const slug = squadSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    names.push(name);
  }

  const outcomes = new Array(names.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= names.length) return;
      outcomes[i] = await readSquad(names[i], owner, fetchFile, probeRepo);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, names.length)) }, worker));

  const result = { byName: {}, missing: [], errors: [], unread: [] };
  for (const outcome of outcomes) {
    if (outcome.squad) {
      result.byName[outcome.name] = outcome.squad;
      if (outcome.problem) result.errors.push({ squad: outcome.name, message: outcome.problem });
    } else if (outcome.missing) result.missing.push(outcome.name);
    else if (outcome.unread) result.unread.push(outcome.unread);
    else result.errors.push(outcome.error);
  }
  return result;
}

const apiHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github.raw+json',
  'User-Agent': 'r2s-lab-dashboard',
});

/** Lê pela API REST do GitHub; o token vai só no cabeçalho, nunca na URL. */
export function githubFetchFile(token) {
  return async (owner, repo, filePath) => {
    const encoded = filePath.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encoded}`;
    const response = await fetch(url, { headers: apiHeaders(token) });
    return { status: response.status, text: response.status === 200 ? await response.text() : undefined };
  };
}

/** Pergunta se o repositório existe e se o token o enxerga (o GitHub responde 404 nos dois casos). */
export function githubProbeRepo(token) {
  return async (owner, repo) => {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const response = await fetch(url, { headers: apiHeaders(token) });
    return { status: response.status };
  };
}

/** Modo offline: lê `dir/<path>`; o repositório `r2s-lab-squad-<slug>` lê de `dir/squads/<slug>/<path>`. */
export function localFetchFile(dir) {
  return async (_owner, repo, filePath) => {
    const squad = /^r2s-lab-squad-(.+)$/.exec(repo || '');
    const base = squad ? path.join(dir, 'squads', squad[1]) : dir;
    try {
      return { status: 200, text: readFileSync(path.join(base, filePath), 'utf8') };
    } catch (err) {
      if (err.code === 'ENOENT') return { status: 404 };
      throw err;
    }
  };
}
