#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { decodeRoster, parseRoster } from './roster.mjs';

const file = process.argv[2];
if (!file) {
  console.log('uso: node src/validate-roster.mjs <caminho do csv>');
  process.exit(1);
}

let text;
try {
  text = decodeRoster(readFileSync(file));
} catch (err) {
  console.log(`não foi possível ler o arquivo: ${err.message}`);
  process.exit(1);
}

const { rows, errors } = parseRoster(text);
if (errors.length > 0) {
  for (const e of errors) console.log(`linha ${e.line}, campo ${e.field}: ${e.message}`);
  process.exit(1);
}
console.log(`${rows.length} pessoas válidas`);
