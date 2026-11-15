import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const tracked = () => execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const TEXT = /\.(mjs|cjs|js|json|html|css|md|csv|ya?ml|txt)$|^\.gitignore$/;

/** O workflow como objeto (PyYAML lê a chave `on` como booleano, que vira "true" no JSON). */
function workflow() {
  const res = spawnSync(
    'python3',
    ['-c', 'import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', path.join(root, '..', '.github', 'workflows', 'dashboard.yml')],
    { encoding: 'utf8' },
  );
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout);
}
const steps = () => workflow().jobs.build.steps;

test('workflow is private and read-only', () => {
  const wf = workflow();
  assert.deepEqual(wf.permissions, { contents: 'read' });
  const uses = steps().map((s) => s.uses || '').join(' ');
  for (const forbidden of ['deploy-pages', 'gh-pages', 'upload-pages-artifact', 'configure-pages']) {
    assert.ok(!uses.includes(forbidden), `workflow uses ${forbidden}`);
  }
  assert.ok(!JSON.stringify(wf).includes('pages: write'));
});

test('workflow reads the token from secrets', () => {
  const build = steps().find((s) => s.run && s.run.includes('src/build.mjs'));
  assert.ok(build, 'a step runs the build');
  assert.equal(build.env.LAB_READ_TOKEN, '${{ secrets.LAB_READ_TOKEN }}');
});

test('workflow keeps the artifact for 7 days', () => {
  const upload = steps().find((s) => (s.uses || '').startsWith('actions/upload-artifact'));
  assert.ok(upload, 'a step uploads the artifact');
  assert.deepEqual([upload.with.name, upload.with.path, upload.with['retention-days']], ['dashboard', 'admin/dist', 7]);
});

test('workflow runs on a schedule and on demand', () => {
  const triggers = workflow().true;
  assert.ok(triggers.schedule && triggers.schedule.length >= 1);
  assert.ok('workflow_dispatch' in triggers);
});

test('dist and node_modules are ignored', () => {
  const lines = read('.gitignore').split('\n').map((l) => l.trim());
  assert.ok(lines.includes('dist/'));
  assert.ok(lines.includes('node_modules/'));
});

test('under roster/ only the real roster and synthetic data are committed', () => {
  const allowedFiles = new Set(['roster/README.md', 'roster/roster.example.csv']);
  const extra = tracked().filter((f) => f.startsWith('roster/') && !allowedFiles.has(f));
  assert.deepEqual(extra, []);
});

test('no real e-mail is committed anywhere', () => {
  const allowed = /@(exemplo\.com|x\.com)$/i;
  const offenders = [];
  for (const file of tracked().filter((f) => TEXT.test(f) && true)) {
    for (const email of read(file).match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []) {
      if (!allowed.test(email)) offenders.push(`${file}: ${email}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the real roster is never committed: roster/roster.csv is ignored', () => {
  const res = spawnSync('git', ['check-ignore', '-q', 'roster/roster.csv'], { cwd: root });
  assert.equal(res.status, 0, 'the participants clone this repository, so the roster must stay out of git');
});

test('the workflow materializes the roster from a secret, not from the checkout', () => {
  const step = steps().find((s) => s.env && s.env.LAB_ROSTER_CSV);
  assert.ok(step, 'a step writes roster/roster.csv from the LAB_ROSTER_CSV secret');
  assert.equal(step.env.LAB_ROSTER_CSV, '${{ secrets.LAB_ROSTER_CSV }}');
});

test('no forbidden wording in tracked files', () => {
  const skip = new Set(['tests/guards.test.mjs']);
  for (const file of tracked().filter((f) => TEXT.test(f) && !skip.has(f) && !f.startsWith('docs/'))) {
    assert.ok(!read(file).includes('Requirement-to-Solution'), `${file} uses the open-question wording`);
  }
});

test('the dashboard page loads nothing from other hosts', () => {
  const html = read('dashboard/index.html');
  const foreign = [...html.matchAll(/<(script|link|img|iframe|source)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]*"/gi)];
  assert.deepEqual(foreign.map((m) => m[0]), []);
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(read('dashboard/dashboard.js')), 'the page never makes network calls');
});

test('the README explains the private build and the token', () => {
  const readme = read('README.md');
  for (const needle of ['LAB_READ_TOKEN', 'node src/build.mjs', 'nunca', 'roster/roster.csv', 'LAB_ROSTER_CSV']) {
    assert.ok(readme.includes(needle), `README should mention "${needle}"`);
  }
});
