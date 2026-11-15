#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { aggregate } from './aggregate.mjs';
import { collectProgress, collectSquads, githubFetchFile, githubProbeRepo, localFetchFile } from './collect.mjs';
import { decodeRoster, parseRoster } from './roster.mjs';
import { aggregateSquads } from './squads.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DASHBOARD = path.join(ROOT, 'dashboard');
const DEFAULT_CONFIG = path.join(ROOT, 'config', 'lab.json');

/** Erros da lista do RH, para a CLI listar linha por linha. */
export class RosterInvalidError extends Error {
  constructor(errors) {
    super('lista do RH inválida');
    this.errors = errors;
  }
}

/**
 * Lê a lista, coleta os arquivos de progresso, agrega e escreve `outDir` com os dados
 * (`data.json` e `data.js`) mais os arquivos de `dashboardDir`.
 */
export async function build({ rosterPath, outDir, config, fetchFile, probeRepo, dashboardDir = DEFAULT_DASHBOARD, now = new Date() }) {
  const { rows, errors } = parseRoster(decodeRoster(readFileSync(rosterPath)));
  if (errors.length) throw new RosterInvalidError(errors);
  if (!existsSync(dashboardDir)) throw new Error(`pasta do painel não encontrada: ${dashboardDir}`);

  const collected = await collectProgress(rows, { owner: config.owner, fetchFile, probeRepo });
  const metrics = aggregate({
    roster: rows,
    progressByHandle: collected.byHandle,
    missing: collected.missing,
    errors: collected.errors,
    unread: collected.unread,
    target: config.target,
    protectedHoursPerWeek: config.protectedHoursPerWeek,
    now,
  });

  const collectedSquads = await collectSquads(rows, { owner: config.owner, fetchFile, probeRepo });
  const { issues, ...squadMetrics } = aggregateSquads({ roster: rows, squads: collectedSquads.byName, now, target: config.target });
  Object.assign(metrics, squadMetrics);
  metrics.dataQuality.squads = {
    missing: collectedSquads.missing, errors: [...collectedSquads.errors, ...issues], unread: collectedSquads.unread,
  };

  mkdirSync(outDir, { recursive: true });
  cpSync(dashboardDir, outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'data.json'), JSON.stringify(metrics, null, 2) + '\n');
  // `<` escapado para que um texto de participante nunca feche uma tag <script>.
  const safe = JSON.stringify(metrics).replace(/</g, '\\u003c');
  writeFileSync(path.join(outDir, 'data.js'), `window.R2S_DATA = ${safe};\n`);
  return metrics;
}

/** 1 só quando a própria API falhou; repositórios que ainda não existem não deixam a execução vermelha. */
export function exitCodeFor(metrics) {
  const unread = [...metrics.dataQuality.unread, ...((metrics.dataQuality.squads && metrics.dataQuality.squads.unread) || [])];
  return unread.some((u) => u.reason === 'api') ? 1 : 0;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const config = JSON.parse(readFileSync(args.config || DEFAULT_CONFIG, 'utf8'));
  const rosterPath = path.resolve(ROOT, args.roster || config.rosterPath);
  const outDir = path.resolve(args.out || 'dist');
  const dashboardDir = args.dashboard ? path.resolve(args.dashboard) : DEFAULT_DASHBOARD;

  let fetchFile;
  let probeRepo;
  if (args.fixtures) {
    fetchFile = localFetchFile(path.resolve(args.fixtures));
    config.owner = config.owner || 'local';
  } else {
    if (!config.owner) {
      console.log('owner não configurado: preencha "owner" em config/lab.json.');
      return 1;
    }
    if (!process.env.LAB_READ_TOKEN) {
      console.log('LAB_READ_TOKEN não definido: o painel precisa de um token de leitura dos repositórios r2s-lab-*.');
      return 1;
    }
    if (!/^[\x21-\x7e]+$/.test(process.env.LAB_READ_TOKEN)) {
      console.log('LAB_READ_TOKEN inválido: use só caracteres ASCII visíveis, sem espaços nem quebras de linha.');
      return 1;
    }
    fetchFile = githubFetchFile(process.env.LAB_READ_TOKEN);
    probeRepo = githubProbeRepo(process.env.LAB_READ_TOKEN);
  }

  try {
    const metrics = await build({ rosterPath, outDir, config, fetchFile, probeRepo, dashboardDir });
    console.log(`painel gerado em ${outDir} (${metrics.totals.invited} pessoas convidadas, ${metrics.squads.length} squads lidas)`);
    const unread = metrics.dataQuality.unread;
    if (unread.length) {
      const api = unread.filter((u) => u.reason === 'api').length;
      console.log(`atenção: ${unread.length} pessoas não puderam ser lidas (${api} por erro da API, ${unread.length - api} sem acesso ou sem repositório); os números estão incompletos.`);
    }
    const squadUnread = metrics.dataQuality.squads.unread;
    if (squadUnread.length) {
      console.log(`atenção: ${squadUnread.length} squads não puderam ser lidas; a seção de squads está incompleta.`);
    }
    return exitCodeFor(metrics);
  } catch (err) {
    if (err instanceof RosterInvalidError) {
      for (const e of err.errors) console.log(`linha ${e.line}, campo ${e.field}: ${e.message}`);
    } else {
      console.log(err.message);
    }
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main(process.argv.slice(2)));
}
