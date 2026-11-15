import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import progress from '../lib/progress.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const PAGES = ['00-prework/index.html', '05-encerramento/pesquisa.html'];
const PUBLIC_FILES = [
  'README.md', ...PAGES, 'css/lab.css', 'js/prework.js', 'js/pesquisa.js', 'js/quizzes.js', 'js/export-ui.js',
  'lib/progress.js', 'lib/calc.js', 'lib/store.js',
];

test('progress/ holds no real progress files', () => {
  const allowed = new Set(['.gitkeep', 'README.md', 'progress.schema.json']);
  const extra = readdirSync(path.join(root, 'progress')).filter((f) => !allowed.has(f));
  assert.deepEqual(extra, []);
});

test('no page loads a script, style, image or media from another host', () => {
  for (const page of PAGES) {
    const html = read(page);
    const foreign = [...html.matchAll(/<(script|link|img|iframe|source|video|audio)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]*"/gi)];
    assert.deepEqual(foreign.map((m) => m[0]), [], page);
    assert.ok(!/@import\s+url\(\s*['"]?https?:/i.test(html), page);
  }
});

test('no forbidden wording in public files', () => {
  for (const file of PUBLIC_FILES) {
    assert.ok(!read(file).includes('Requirement-to-Solution'), `${file} uses the open-question wording`);
  }
});

test('no shell command named r2s in the pages', () => {
  for (const page of PAGES) assert.doesNotMatch(read(page), /^\s*\$?\s*r2s\s/m, page);
});

test('schema file matches lib/progress.js', () => {
  const schema = JSON.parse(read('progress/progress.schema.json'));
  const { SCHEMA_ID, PREWORK_BLOCKS, QUIZ_IDS, COMPETENCIES, RATINGS } = progress;
  assert.equal(schema.$id, SCHEMA_ID);
  assert.deepEqual(schema.properties.schema.const, SCHEMA_ID);
  assert.deepEqual(schema.properties.prework.properties.blocks.propertyNames.enum, PREWORK_BLOCKS.map((b) => b.id));
  assert.deepEqual(schema.properties.prework.properties.quizzes.propertyNames.enum, QUIZ_IDS);
  const self = schema.properties.selfAssessment.oneOf.find((o) => o.type === 'object');
  assert.deepEqual(Object.keys(self.properties), COMPETENCIES);
  const survey = schema.properties.survey.oneOf.find((o) => o.type === 'object');
  assert.deepEqual(Object.keys(survey.properties.ratings.properties), RATINGS);
  assert.deepEqual(survey.properties.consent.enum, ['nao', 'anon', 'nome']);
});
