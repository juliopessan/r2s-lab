import { test } from 'node:test';
import assert from 'node:assert/strict';
import calc from '../lib/calc.js';

const { costPerTransaction, g1Value } = calc;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} ${a} !== ${b}`);
const EXAMPLE = { tokensIn: 2000, tokensOut: 500, priceIn: 10, priceOut: 40, calls: 1 };

test('costPerTransaction default example', () => {
  close(costPerTransaction(EXAMPLE), 0.04);
});

test('six calls multiply the cost', () => {
  close(costPerTransaction({ ...EXAMPLE, calls: 6 }), 0.24);
});

test('calls below 1 count as 1', () => {
  close(costPerTransaction({ ...EXAMPLE, calls: 0 }), 0.04);
});

test('g1Value example fails G1', () => {
  const r = g1Value({ tx: 800, minutes: 15, hourCost: 90, adoptionPct: 70, runCost: 60000 });
  close(r.value, 151200, 'value');
  close(r.threshold, 180000, 'threshold');
  close(r.multiple, 2.52, 'multiple');
  close(r.shortfall, 28800, 'shortfall');
  assert.equal(r.passes, false);
});

test('g1Value passes when the run cost falls', () => {
  const r = g1Value({ tx: 800, minutes: 15, hourCost: 90, adoptionPct: 70, runCost: 40000 });
  assert.equal(r.passes, true);
  assert.equal(r.shortfall, 0);
});

test('g1Value with zero run cost has no multiple', () => {
  const r = g1Value({ tx: 800, minutes: 15, hourCost: 90, adoptionPct: 70, runCost: 0 });
  assert.equal(r.multiple, null);
});
