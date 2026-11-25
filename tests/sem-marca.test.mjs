import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* O lab não leva o nome de nenhuma empresa: nem nas páginas, nem nos comentários, nem na documentação. */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROIBIDO = /avanade|brazil engineering|\bBEH\b/i;

test('no tracked text file names the company or its business unit', () => {
  const arquivos = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n')
    .filter((f) => /\.(html|css|js|mjs|cjs|md|json|txt|vtt|svg|csv|yml|yaml)$/.test(f) && !['tests/sem-marca.test.mjs', 'site/tests/start.test.mjs'].includes(f)); // os dois testes citam o padrão proibido
  assert.ok(arquivos.length > 50);
  const achados = arquivos.filter((f) => { try { return PROIBIDO.test(readFileSync(path.join(root, f), 'utf8')); } catch { return false; } });
  assert.deepEqual(achados, []);
});
