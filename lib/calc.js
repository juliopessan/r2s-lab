/* R2S Lab — cálculos do pre-work (custo por transação e regra do G1).
 * UMD: no Node é `module.exports`; no navegador vira `window.R2SCalc`. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.R2SCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function cents(v) { return Math.round(v * 100) / 100; }

  /** R$ por transação; os preços são por 1 milhão de tokens. */
  function costPerTransaction(i) {
    var calls = Math.max(1, num(i.calls));
    return ((num(i.tokensIn) * num(i.priceIn) + num(i.tokensOut) * num(i.priceOut)) / 1e6) * calls;
  }

  /** Valor anual contra 3× o custo anual de run (regra do G1). */
  function g1Value(i) {
    var value = cents(num(i.tx) * 12 * (num(i.minutes) / 60) * num(i.hourCost) * (num(i.adoptionPct) / 100));
    var run = num(i.runCost);
    var threshold = 3 * run;
    return {
      value: value,
      threshold: threshold,
      multiple: run > 0 ? value / run : null,
      passes: value > threshold,
      shortfall: Math.max(0, cents(threshold - value)),
    };
  }

  return { costPerTransaction: costPerTransaction, g1Value: g1Value };
});
