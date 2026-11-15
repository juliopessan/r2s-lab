import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, exitCodeFor } from '../src/build.mjs';
import { localFetchFile } from '../src/collect.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'tests', 'fixtures');
const cli = path.join(root, 'src', 'build.mjs');
const NOW = new Date('2026-12-03T12:00:00Z');
const tmp = () => mkdtempSync(path.join(tmpdir(), 'r2s-build-'));

function dashboardDir() {
  const dir = tmp();
  writeFileSync(path.join(dir, 'marker.txt'), 'marker');
  mkdirSync(path.join(dir, 'sub'));
  writeFileSync(path.join(dir, 'sub', 'inner.txt'), 'inner');
  return dir;
}

const run = (args, env = {}) =>
  spawnSync('node', [cli, ...args], { encoding: 'utf8', env: { ...process.env, LAB_READ_TOKEN: '', ...env } });

async function buildFixtures(out = tmp()) {
  const metrics = await build({
    rosterPath: path.join(fixtures, 'roster.csv'),
    outDir: out,
    config: { owner: 'local', target: 100, protectedHoursPerWeek: 6 },
    fetchFile: localFetchFile(fixtures),
    dashboardDir: dashboardDir(),
    now: NOW,
  });
  return { metrics, out };
}

test('build with fixtures writes data.json and data.js', async () => {
  const { metrics, out } = await buildFixtures();
  assert.deepEqual(metrics.totals, { invited: 6, started: 4, preworkDone: 3, surveyDone: 3, missing: 3, unread: 0 });
  const json = JSON.parse(readFileSync(path.join(out, 'data.json'), 'utf8'));
  assert.deepEqual(json, metrics);
  const js = readFileSync(path.join(out, 'data.js'), 'utf8');
  assert.ok(js.startsWith('window.R2S_DATA = '));
  assert.deepEqual(JSON.parse(js.slice('window.R2S_DATA = '.length).replace(/;\s*$/, '')), metrics);
  assert.deepEqual(metrics.dataQuality.missingFiles, ['elisarocha']);
  assert.equal(metrics.dataQuality.errors[0].github, 'fabionunes');
});

test('data.json and data.js have no emails', async () => {
  const { out } = await buildFixtures();
  for (const file of ['data.json', 'data.js']) {
    assert.ok(!readFileSync(path.join(out, file), 'utf8').includes('@exemplo.com'), file);
  }
});

test('data.js cannot close a script tag from user text', async () => {
  const { out } = await buildFixtures();
  assert.ok(!readFileSync(path.join(out, 'data.js'), 'utf8').includes('</'));
});

test('build copies the dashboard files, including subfolders', async () => {
  const { out } = await buildFixtures();
  assert.equal(readFileSync(path.join(out, 'marker.txt'), 'utf8'), 'marker');
  assert.equal(readFileSync(path.join(out, 'sub', 'inner.txt'), 'utf8'), 'inner');
});

test('build fails when the dashboard folder is missing', async () => {
  await assert.rejects(
    () => build({
      rosterPath: path.join(fixtures, 'roster.csv'), outDir: tmp(),
      config: { owner: 'local', target: 100, protectedHoursPerWeek: 6 },
      fetchFile: localFetchFile(fixtures), dashboardDir: path.join(tmp(), 'nao-existe'), now: NOW,
    }),
    /pasta do painel não encontrada/,
  );
});

test('cli with fixtures exits 0 and writes the files', () => {
  const out = tmp();
  const res = run(['--roster', path.join(fixtures, 'roster.csv'), '--fixtures', fixtures, '--out', out, '--dashboard', dashboardDir()]);
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /painel gerado/);
  assert.ok(existsSync(path.join(out, 'data.json')));
});

test('cli without owner exits 1 and says why', () => {
  const res = run(['--roster', path.join(fixtures, 'roster.csv'), '--out', tmp(), '--dashboard', dashboardDir()]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /owner não configurado/);
});

test('cli without token exits 1', () => {
  const config = path.join(tmp(), 'lab.json');
  writeFileSync(config, JSON.stringify({ owner: 'org', target: 100, protectedHoursPerWeek: 6, rosterPath: 'x.csv' }));
  const res = run(['--config', config, '--roster', path.join(fixtures, 'roster.csv'), '--out', tmp(), '--dashboard', dashboardDir()]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /LAB_READ_TOKEN/);
});

test('cli with an invalid roster exits 1 and lists the lines', () => {
  const bad = path.join(tmp(), 'bad.csv');
  writeFileSync(bad, [
    'nome,email,github,onda,papel_atual,multiplicador',
    'Ana,a@x.com,ana,0,Data Engineer,sim',
    'Bia,A@x.com,bia,0,Data Engineer,nao',
  ].join('\n'));
  const res = run(['--roster', bad, '--fixtures', fixtures, '--out', tmp(), '--dashboard', dashboardDir()]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /linha 3, campo email/);
});

test('the default config has the target and the protected hours, and no owner yet', () => {
  const config = JSON.parse(readFileSync(path.join(root, 'config', 'lab.json'), 'utf8'));
  assert.deepEqual(config, { owner: '', target: 100, protectedHoursPerWeek: 6, rosterPath: 'roster/roster.csv' });
});

/* ---------- pessoas não lidas, probe e token ---------- */

const buildWith = (fetchFile, probeRepo) =>
  build({
    rosterPath: path.join(fixtures, 'roster.csv'), outDir: tmp(), config: CONFIG_LOCAL, fetchFile, probeRepo,
    dashboardDir: dashboardDir(), now: NOW,
  });
const CONFIG_LOCAL = { owner: 'local', target: 100, protectedHoursPerWeek: 6 };

test('build reports repositories the token cannot see as unread, not missing', async () => {
  const m = await buildWith(async () => ({ status: 404 }), async () => ({ status: 404 }));
  assert.equal(m.totals.unread, 6);
  assert.deepEqual(m.dataQuality.missingFiles, []);
  assert.ok(m.dataQuality.unread.every((u) => u.reason === 'repo'));
});

test('exitCodeFor fails only when the API itself failed', async () => {
  const apiDown = await buildWith(async () => ({ status: 500 }));
  assert.equal(exitCodeFor(apiDown), 1);
  const reposMissing = await buildWith(async () => ({ status: 404 }), async () => ({ status: 404 }));
  assert.equal(exitCodeFor(reposMissing), 0, 'repositories that do not exist yet must not turn the run red');
  const fine = await buildWith(localFetchFile(fixtures));
  assert.equal(exitCodeFor(fine), 0);
});

test('cli rejects a malformed token without echoing it', () => {
  const config = path.join(tmp(), 'lab.json');
  writeFileSync(config, JSON.stringify({ owner: 'org', target: 100, protectedHoursPerWeek: 6, rosterPath: 'x.csv' }));
  const res = run(
    ['--config', config, '--roster', path.join(fixtures, 'roster.csv'), '--out', tmp(), '--dashboard', dashboardDir()],
    { LAB_READ_TOKEN: 'ghp_SEC\nRET' },
  );
  assert.equal(res.status, 1);
  assert.match(res.stdout, /LAB_READ_TOKEN inválido/);
  assert.ok(!(res.stdout + res.stderr).includes('ghp_SEC'));
});

/* ---------- squads, certificação e scorecard no painel ---------- */

test('build adds the squads, the certification and a ten-item scorecard from the fixture', async () => {
  const { metrics } = await buildFixtures();
  assert.equal(metrics.squads.length, 1);
  assert.equal(metrics.squads[0].squad, 'multiplicadores');
  assert.equal(metrics.certification.trained, 2);
  assert.equal(metrics.scorecard.length, 10);
  assert.deepEqual(metrics.dataQuality.squads, { missing: [], errors: [], unread: [] });
});

test('the squad data adds no e-mails and no member names', async () => {
  const { metrics, out } = await buildFixtures();
  const squadParts = JSON.stringify({ squads: metrics.squads, certification: metrics.certification, scorecard: metrics.scorecard, squadQuality: metrics.dataQuality.squads });
  assert.ok(!/Ana Souza|Bruno Lima|Carla Mendes/.test(squadParts), 'a squad section leaks a member name');
  assert.ok(!squadParts.includes('@'), 'a squad section leaks an e-mail');
  // Fora das squads, o nome só aparece como autor de um feedback com consentimento `nome`.
  for (const file of ['data.json', 'data.js']) {
    const text = readFileSync(path.join(out, file), 'utf8');
    assert.ok(!text.includes('@exemplo.com'), file);
    assert.ok(!/Bruno Lima|Carla Mendes/.test(text), `${file} leaks a name without consent`);
  }
});

const squadFailure = (squadStatus, probeStatus) =>
  buildWith(async (owner, repo, p) => {
    if (repo.startsWith('r2s-lab-squad-')) return { status: squadStatus };
    return localFetchFile(fixtures)(owner, repo, p);
  }, probeStatus ? async () => ({ status: probeStatus }) : undefined);

test('an API failure on a squad repository turns the run red', async () => {
  const m = await squadFailure(500);
  assert.equal(m.dataQuality.squads.unread[0].reason, 'api');
  assert.equal(exitCodeFor(m), 1);
});

test('a squad repository that does not exist is unread with reason repo and keeps the run green', async () => {
  const m = await squadFailure(404, 404);
  assert.equal(m.dataQuality.squads.unread[0].reason, 'repo');
  assert.equal(exitCodeFor(m), 0);
  assert.deepEqual(m.squads, []);
});

test('a roster with no squad column produces no squads and no error', async () => {
  const noSquads = path.join(tmp(), 'sem-squad.csv');
  writeFileSync(noSquads, [
    'nome,email,github,onda,papel_atual,multiplicador',
    'Ana Souza,ana.souza@exemplo.com,anasouza,0,Data Engineer,sim',
  ].join('\n'));
  const m = await build({
    rosterPath: noSquads, outDir: tmp(), config: CONFIG_LOCAL, fetchFile: localFetchFile(fixtures), dashboardDir: dashboardDir(), now: NOW,
  });
  assert.deepEqual(m.squads, []);
  assert.equal(m.scorecard.length, 10);
  assert.equal(m.certification.trained, 0);
  assert.deepEqual(m.dataQuality.squads, { missing: [], errors: [], unread: [] });
});

test('the cli with --fixtures builds everything and says how many squads it read', () => {
  const out = tmp();
  const res = run(['--roster', path.join(fixtures, 'roster.csv'), '--fixtures', fixtures, '--out', out, '--dashboard', dashboardDir()]);
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.equal(JSON.parse(readFileSync(path.join(out, 'data.json'), 'utf8')).squads.length, 1);
});

test('a person assessed in two squads shows up as a data-quality error', async () => {
  const dir = tmp();
  cpSync(path.join(fixtures, 'progress'), path.join(dir, 'progress'), { recursive: true });
  cpSync(path.join(fixtures, 'squads', 'multiplicadores'), path.join(dir, 'squads', 'multiplicadores'), { recursive: true });
  cpSync(path.join(fixtures, 'squads', 'multiplicadores'), path.join(dir, 'squads', 'outra'), { recursive: true });
  const rosterPath = path.join(dir, 'roster.csv');
  writeFileSync(rosterPath, readFileSync(path.join(fixtures, 'roster.csv'), 'utf8').replace('Diego Alves,diego.alves@exemplo.com,diegoalves,1,Data Architect,nao,,', 'Diego Alves,diego.alves@exemplo.com,diegoalves,1,Data Architect,nao,outra,upskilling'));
  const m = await build({ rosterPath, outDir: tmp(), config: CONFIG_LOCAL, fetchFile: localFetchFile(dir), dashboardDir: dashboardDir(), now: NOW });
  assert.equal(m.certification.people.length, 3);
  assert.ok(m.dataQuality.squads.errors.some((e) => /mais de uma squad/.test(e.message)));
});
