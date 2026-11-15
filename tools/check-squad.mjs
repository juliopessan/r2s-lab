#!/usr/bin/env node
// Confere a pasta da squad: valida o gates.json e cruza os gates aprovados com os documentos.
// Uso: node tools/check-squad.mjs [pasta]   (padrão: squad)
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import squadLib from '../lib/squad.js';

const { DOCS, DOC_FILES, DOC_NAMES, validateSquad, dossierStatus, currentGate, squadChecks } = squadLib;

const readIfExists = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : undefined);

/** Devolve as linhas do relatório e a lista de erros (pendências não são erro). */
export function runCheck(dir) {
  const lines = [];
  const errors = [];

  const gatesPath = path.join(dir, 'gates.json');
  const gatesText = readIfExists(gatesPath);
  if (gatesText === undefined) return { errors: [`gates.json não encontrado em ${dir}`], lines };

  let gates;
  try {
    gates = JSON.parse(gatesText);
  } catch {
    return { errors: ['gates.json não é um JSON válido.'], lines };
  }

  const docs = {};
  for (const key of DOCS) {
    const text = readIfExists(path.join(dir, DOC_FILES[key]));
    if (text !== undefined) docs[key] = text;
  }
  const golden = readIfExists(path.join(dir, 'golden-set.csv'));
  const goldenRows = golden ? Math.max(0, golden.split('\n').filter((l) => l.trim()).length - 1) : 0;

  const contract = validateSquad(gates);
  errors.push(...contract.errors);

  if (contract.ok) {
    lines.push(`Squad: ${gates.squad || '(sem nome)'} · caso: ${gates.case || '(sem caso)'}`);
    const current = currentGate(gates);
    lines.push(
      current.done
        ? 'Todos os gates aprovados.'
        : `Gate atual: ${current.gate}${current.killed ? ' (encerrado)' : ''}`,
    );
  }

  const status = dossierStatus(docs);
  for (const key of DOCS) {
    const d = status.byDoc[key];
    lines.push(`- ${DOC_NAMES[key]}: ${d.percent}% (${d.pending} pendentes)`);
  }
  lines.push(`Dossiê: ${status.percent}% (${status.pending} de ${status.total} campos pendentes)`);
  lines.push(`Golden set: ${goldenRows} casos`);

  if (contract.ok) errors.push(...squadChecks(gates, { docs, goldenRows }));
  return { errors, lines };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, lines } = runCheck(process.argv[2] || 'squad');
  for (const line of lines) console.log(line);
  for (const error of errors) console.log(`erro: ${error}`);
  process.exit(errors.length ? 1 : 0);
}
