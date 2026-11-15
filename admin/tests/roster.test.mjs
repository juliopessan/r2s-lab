import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRoster, decodeRoster } from '../src/roster.mjs';

const HEADER = 'nome,email,github,onda,papel_atual,multiplicador';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src', 'validate-roster.mjs');

test('parses a valid comma file', () => {
  const text = [
    HEADER,
    'Ana Souza,ana@exemplo.com,anasouza,0,Data Engineer,sim',
    'Bruno Lima,bruno@exemplo.com,brunolima,1,Data Scientist,nao',
  ].join('\n');
  const { rows, errors } = parseRoster(text);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    nome: 'Ana Souza',
    email: 'ana@exemplo.com',
    github: 'anasouza',
    onda: 0,
    squad: null,
    papelAtual: 'Data Engineer',
    trilha: null,
    multiplicador: true,
  });
});

test('accepts semicolon, BOM, CRLF and accents', () => {
  const text =
    '﻿nome;email;github;onda;papel_atual;multiplicador\r\n' +
    'João Conceição;joao@exemplo.com;joaoc;1;data engineer;nao\r\n\r\n';
  const { rows, errors } = parseRoster(text);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nome, 'João Conceição');
  assert.equal(rows[0].papelAtual, 'Data Engineer');
});

test('accepts the accented spelling não', () => {
  const text = [HEADER, 'Ana,ana@exemplo.com,ana,0,Data Engineer,não'].join('\n');
  const { rows, errors } = parseRoster(text);
  assert.deepEqual(errors, []);
  assert.equal(rows[0].multiplicador, false);
});

test('flags duplicate email ignoring case', () => {
  const text = [
    HEADER,
    'Ana,A@x.com,ana,0,Data Engineer,sim',
    'Ana Dois,a@x.com,ana2,0,Data Engineer,nao',
  ].join('\n');
  const { rows, errors } = parseRoster(text);
  assert.deepEqual(errors, [{ line: 3, field: 'email', message: 'e-mail duplicado' }]);
  assert.equal(rows.length, 1);
});

test('flags duplicate github handle', () => {
  const text = [
    HEADER,
    'Ana,a@x.com,ana,0,Data Engineer,sim',
    'Bia,b@x.com,ANA,0,Data Engineer,nao',
  ].join('\n');
  const { errors } = parseRoster(text);
  assert.deepEqual(errors, [
    { line: 3, field: 'github', message: 'usuário do GitHub duplicado' },
  ]);
});

test('rejects invalid github handles', () => {
  const text = [
    HEADER,
    'A,a@x.com,-joao,0,Data Engineer,sim',
    'B,b@x.com,a_b,0,Data Engineer,sim',
    `C,c@x.com,${'a'.repeat(40)},0,Data Engineer,sim`,
  ].join('\n');
  const { errors, rows } = parseRoster(text);
  assert.equal(rows.length, 0);
  assert.deepEqual(
    errors.map((e) => [e.line, e.field]),
    [[2, 'github'], [3, 'github'], [4, 'github']],
  );
});

test('rejects unknown role, bad multiplier and bad wave', () => {
  const text = [HEADER, 'A,a@x.com,aa,1.5,Analista,talvez'].join('\n');
  const { errors, rows } = parseRoster(text);
  assert.equal(rows.length, 0);
  assert.deepEqual(errors.map((e) => e.field).sort(), [
    'multiplicador',
    'onda',
    'papel_atual',
  ]);
});

test('reports missing required column once', () => {
  const text = ['nome,github,onda,papel_atual,multiplicador', 'A,aa,0,Data Engineer,sim'].join('\n');
  const { errors, rows } = parseRoster(text);
  assert.equal(rows.length, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 1);
  assert.equal(errors[0].field, 'cabecalho');
});

test('rejects empty input', () => {
  for (const text of ['', '   \n\n']) {
    const { errors, rows } = parseRoster(text);
    assert.equal(rows.length, 0);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].line, 1);
    assert.equal(errors[0].field, 'cabecalho');
  }
});

test('cli exits 0 on the example file and 1 on an invalid file', () => {
  const ok = spawnSync('node', [cli, path.join(root, 'roster', 'roster.example.csv')], {
    encoding: 'utf8',
  });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /pessoas válidas/);

  const dir = mkdtempSync(path.join(tmpdir(), 'roster-'));
  const bad = path.join(dir, 'bad.csv');
  writeFileSync(
    bad,
    [
      HEADER,
      'Ana,a@x.com,ana,0,Data Engineer,sim',
      'Bia,A@x.com,bia,0,Data Engineer,nao',
    ].join('\n'),
  );
  const res = spawnSync('node', [cli, bad], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stdout, /linha 3, campo email/);
});

test('decodeRoster rejects a Windows-1252 export', () => {
  const buffer = Buffer.from('nome;email\nJoão;j@x.com', 'latin1');
  assert.throws(() => decodeRoster(buffer), /UTF-8/);
});

test('decodeRoster keeps UTF-8 accents and drops the BOM', () => {
  const buffer = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('nome\nJoão', 'utf8')]);
  assert.equal(decodeRoster(buffer), 'nome\nJoão');
});

test('replacement characters are a header-level error', () => {
  const { rows, errors } = parseRoster(`${HEADER}\nJo\uFFFDo,a@x.com,joao,0,Data Engineer,sim`);
  assert.equal(rows.length, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, 'cabecalho');
  assert.match(errors[0].message, /UTF-8/);
});

test('rows made only of delimiters are ignored', () => {
  const text = [
    'nome;email;github;onda;papel_atual;multiplicador',
    'Ana;a@x.com;ana;0;Data Engineer;sim',
    ';;;;;',
    ';;;;;',
  ].join('\r\n');
  const { rows, errors } = parseRoster(text);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 1);
});

test('cli rejects a Windows-1252 file with exit 1 and a UTF-8 hint', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'roster-'));
  const file = path.join(dir, 'cp1252.csv');
  writeFileSync(
    file,
    Buffer.from('nome;email;github;onda;papel_atual;multiplicador\nJoão;j@x.com;joao;0;Data Engineer;nao', 'latin1'),
  );
  const res = spawnSync('node', [cli, file], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stdout, /UTF-8/);
});
