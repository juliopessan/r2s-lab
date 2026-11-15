import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import progress from '../src/vendor/progress.cjs';

const { SCHEMA_ID, TOTAL_MIN, validateProgress, preworkMinutes } = progress;
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'progress');
const load = (handle) => JSON.parse(readFileSync(path.join(fixtures, `${handle}.json`), 'utf8'));

test('vendored contract is r2s-progress/1', () => {
  assert.equal(SCHEMA_ID, 'r2s-progress/1');
  assert.equal(TOTAL_MIN, 480);
});

test('fixture files for ana, bruno, carla and diego are valid', () => {
  for (const handle of ['anasouza', 'brunolima', 'carlamendes', 'diegoalves']) {
    assert.deepEqual(validateProgress(load(handle)), { ok: true, errors: [] }, handle);
  }
});

test('fixture for fabio is invalid', () => {
  assert.equal(validateProgress(load('fabionunes')).ok, false);
});

test('there is no file for elisa', () => {
  assert.equal(existsSync(path.join(fixtures, 'elisarocha.json')), false);
});

test('full fixtures add up to 480 minutes and diego to 105', () => {
  for (const handle of ['anasouza', 'brunolima', 'carlamendes']) assert.equal(preworkMinutes(load(handle)), 480, handle);
  assert.equal(preworkMinutes(load('diegoalves')), 105);
});

test('the survey fixtures carry the planned consents and scores', () => {
  assert.deepEqual(
    ['anasouza', 'brunolima', 'carlamendes'].map((h) => [load(h).survey.consent, load(h).survey.nps]),
    [['nome', 10], ['anon', 8], ['nao', 5]],
  );
  assert.equal(load('diegoalves').survey, null);
});

test('the fixture roster matches the example roster', () => {
  const fixture = readFileSync(path.join(fixtures, '..', 'roster.csv'), 'utf8');
  const example = readFileSync(path.join(fixtures, '..', '..', '..', 'roster', 'roster.example.csv'), 'utf8');
  assert.equal(fixture, example);
});
