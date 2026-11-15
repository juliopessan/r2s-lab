import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRoster } from '../src/roster.mjs';
import { collectProgress, githubFetchFile, githubProbeRepo, localFetchFile } from '../src/collect.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const roster = parseRoster(readFileSync(path.join(fixtures, 'roster.csv'), 'utf8')).rows;
const fixture = (handle) => readFileSync(path.join(fixtures, 'progress', `${handle}.json`), 'utf8');
const person = (github) => ({ nome: 'X', email: 'x@exemplo.com', github, onda: 0, squad: null, papelAtual: 'Data Engineer', trilha: null, multiplicador: false });

/** FetchFile falso: `respond(owner, repo, path)` devolve { status, text } ou lança. */
const fake = (respond) => {
  const calls = [];
  const fetchFile = async (owner, repo, p) => { calls.push({ owner, repo, path: p }); return respond(owner, repo, p); };
  return { fetchFile, calls };
};
const notFound = () => ({ status: 404 });

test('reads each person\'s file from r2s-lab-<handle>', async () => {
  const { fetchFile, calls } = fake(notFound);
  await collectProgress(roster, { owner: 'org-x', fetchFile });
  assert.equal(calls.length, 6);
  assert.deepEqual(calls.find((c) => c.repo === 'r2s-lab-anasouza'), { owner: 'org-x', repo: 'r2s-lab-anasouza', path: 'progress/anasouza.json' });
});

test('404 means missing', async () => {
  const { fetchFile } = fake(notFound);
  const result = await collectProgress(roster, { owner: 'o', fetchFile });
  assert.deepEqual(result.missing, ['anasouza', 'brunolima', 'carlamendes', 'diegoalves', 'elisarocha', 'fabionunes']);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.byHandle, {});
});

test('403, 429 and 500 are unread api failures, not missing', async () => {
  for (const status of [403, 429, 500]) {
    const { fetchFile } = fake(() => ({ status }));
    const result = await collectProgress([person('anasouza')], { owner: 'o', fetchFile });
    assert.deepEqual(result.missing, [], `status ${status}`);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.unread, [{ github: 'anasouza', reason: 'api', message: `falha ao ler (status ${status})` }]);
  }
});

test('a thrown error is reported per person and does not stop the others', async () => {
  const { fetchFile } = fake((owner, repo) => {
    if (repo === 'r2s-lab-anasouza') throw new Error('rede caiu');
    return { status: 200, text: fixture(repo.replace('r2s-lab-', '')) };
  });
  const result = await collectProgress([person('anasouza'), person('brunolima')], { owner: 'o', fetchFile });
  assert.deepEqual(result.unread, [{ github: 'anasouza', reason: 'api', message: 'falha ao ler (Error)' }]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(result.byHandle), ['brunolima']);
});

test('invalid json and invalid schema are errors', async () => {
  const bad = fake((o, repo) => ({ status: 200, text: repo.endsWith('anasouza') ? '{nope' : fixture('fabionunes') }));
  const result = await collectProgress([person('anasouza'), person('fabionunes')], { owner: 'o', fetchFile: bad.fetchFile });
  assert.deepEqual(result.errors[0], { github: 'anasouza', message: 'JSON inválido' });
  assert.equal(result.errors[1].github, 'fabionunes');
  assert.match(result.errors[1].message, /^schema deve ser r2s-progress\/1\./);
  assert.deepEqual(result.byHandle, {});
});

test('a file that belongs to another user is an error', async () => {
  const { fetchFile } = fake(() => ({ status: 200, text: fixture('brunolima') }));
  const result = await collectProgress([person('anasouza')], { owner: 'o', fetchFile });
  assert.deepEqual(result.errors, [{ github: 'anasouza', message: 'o arquivo é de outro usuário' }]);
});

test('matching ignores case and the requested path is lowercase', async () => {
  const { fetchFile, calls } = fake(() => ({ status: 200, text: fixture('anasouza') }));
  const result = await collectProgress([person('AnaSouza')], { owner: 'o', fetchFile });
  assert.equal(calls[0].path, 'progress/anasouza.json');
  assert.deepEqual(Object.keys(result.byHandle), ['anasouza']);
  assert.deepEqual(result.errors, []);
});

test('respects the concurrency limit', async () => {
  let running = 0;
  let peak = 0;
  const { fetchFile } = fake(async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
    return { status: 404 };
  });
  await collectProgress(roster, { owner: 'o', fetchFile, concurrency: 2 });
  assert.equal(peak, 2);
});

test('empty owner throws', async () => {
  const { fetchFile } = fake(notFound);
  await assert.rejects(() => collectProgress(roster, { owner: '', fetchFile }), /owner não configurado/);
});

test('an empty roster collects nothing', async () => {
  const { fetchFile, calls } = fake(notFound);
  assert.deepEqual(await collectProgress([], { owner: 'o', fetchFile }), { byHandle: {}, missing: [], errors: [], unread: [] });
  assert.equal(calls.length, 0);
});

test('localFetchFile reads the fixture folder', async () => {
  const result = await collectProgress(roster, { owner: 'x', fetchFile: localFetchFile(fixtures) });
  assert.deepEqual(Object.keys(result.byHandle).sort(), ['anasouza', 'brunolima', 'carlamendes', 'diegoalves']);
  assert.deepEqual(result.missing, ['elisarocha']);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].github, 'fabionunes');
});

test('githubFetchFile sends the headers and keeps the token out of the url', async () => {
  const original = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, options) => {
    seen.push({ url, options });
    return { status: 200, text: async () => 'conteudo' };
  };
  try {
    const out = await githubFetchFile('TOKEN123')('org', 'r2s-lab-a', 'progress/a.json');
    assert.deepEqual(out, { status: 200, text: 'conteudo' });
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(seen[0].url, 'https://api.github.com/repos/org/r2s-lab-a/contents/progress/a.json');
  assert.ok(!seen[0].url.includes('TOKEN123'));
  assert.equal(seen[0].options.headers.Authorization, 'Bearer TOKEN123');
  assert.equal(seen[0].options.headers.Accept, 'application/vnd.github.raw+json');
  assert.equal(seen[0].options.headers['User-Agent'], 'r2s-lab-dashboard');
});

test('githubFetchFile does not read the body of a failed request', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 404, text: async () => { throw new Error('should not be read'); } });
  try {
    assert.deepEqual(await githubFetchFile('t')('o', 'r', 'p'), { status: 404, text: undefined });
  } finally {
    globalThis.fetch = original;
  }
});

/* ---------- repositório inacessível, probe e vazamento de segredo ---------- */

test('a repo the token cannot see is unread, not missing', async () => {
  const { fetchFile } = fake(notFound);
  const probeRepo = async () => ({ status: 404 });
  const result = await collectProgress([person('anasouza')], { owner: 'o', fetchFile, probeRepo });
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.unread, [
    { github: 'anasouza', reason: 'repo', message: 'repositório r2s-lab-anasouza não encontrado ou sem acesso do token' },
  ]);
});

test('a repo that exists without the file is missing', async () => {
  const { fetchFile } = fake(notFound);
  const probed = [];
  const probeRepo = async (owner, repo) => { probed.push([owner, repo]); return { status: 200 }; };
  const result = await collectProgress([person('anasouza')], { owner: 'org', fetchFile, probeRepo });
  assert.deepEqual(result.missing, ['anasouza']);
  assert.deepEqual(result.unread, []);
  assert.deepEqual(probed, [['org', 'r2s-lab-anasouza']]);
});

test('a failing probe is an api problem', async () => {
  const { fetchFile } = fake(notFound);
  for (const probeRepo of [async () => ({ status: 500 }), async () => { throw new Error('x'); }]) {
    const result = await collectProgress([person('anasouza')], { owner: 'o', fetchFile, probeRepo });
    assert.equal(result.missing.length, 0);
    assert.equal(result.unread.length, 1);
    assert.equal(result.unread[0].reason, 'api');
  }
});

test('the probe is only used when the file was not found', async () => {
  const { fetchFile } = fake(() => ({ status: 200, text: fixture('anasouza') }));
  let probes = 0;
  await collectProgress([person('anasouza')], { owner: 'o', fetchFile, probeRepo: async () => { probes++; return { status: 200 }; } });
  assert.equal(probes, 0);
});

test('an exception message is never copied into the result', async () => {
  const { fetchFile } = fake(() => { throw new TypeError('Headers.append: "Bearer ghp_SECRET" is an invalid header value'); });
  const result = await collectProgress([person('anasouza')], { owner: 'o', fetchFile });
  assert.deepEqual(result.unread, [{ github: 'anasouza', reason: 'api', message: 'falha ao ler (TypeError)' }]);
  assert.ok(!JSON.stringify(result).includes('ghp_SECRET'));
});

test('a network error code is kept because it is safe and useful', async () => {
  const { fetchFile } = fake(() => { const e = new TypeError('fetch failed'); e.cause = { code: 'ENOTFOUND' }; throw e; });
  const result = await collectProgress([person('anasouza')], { owner: 'o', fetchFile });
  assert.equal(result.unread[0].message, 'falha ao ler (ENOTFOUND)');
});

test('githubProbeRepo asks for the repository itself with the same headers', async () => {
  const original = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, options) => { seen.push({ url, options }); return { status: 200 }; };
  try {
    assert.deepEqual(await githubProbeRepo('TOKEN123')('org', 'r2s-lab-a'), { status: 200 });
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(seen[0].url, 'https://api.github.com/repos/org/r2s-lab-a');
  assert.equal(seen[0].options.headers.Authorization, 'Bearer TOKEN123');
  assert.equal(seen[0].options.headers['User-Agent'], 'r2s-lab-dashboard');
});
