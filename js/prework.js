/* R2S Lab — página do pre-work. Script clássico (sem módulos), para abrir também por file://. */
(function () {
  'use strict';

  var P = window.R2SProgress;
  var store = window.R2SStore;
  var state = store.load();

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function fmtMin(m) {
    var h = Math.floor(m / 60), r = m % 60;
    if (!h) return r + ' min';
    return h + ' h' + (r ? ' ' + r + ' min' : '');
  }

  function persist() {
    state.updatedAt = new Date().toISOString();
    store.save(state);
  }

  function renderProgress() {
    var done = P.preworkMinutes(state);
    var pct = Math.round((100 * done) / P.TOTAL_MIN);
    $('#progHours').textContent = fmtMin(done);
    $('#progPct').textContent = pct + '%';
    $('#progFill').style.width = (100 * done) / P.TOTAL_MIN + '%';
    $('#progBar').setAttribute('aria-valuenow', String(done));
  }

  $$('input[data-block]').forEach(function (box) {
    var id = box.dataset.block;
    box.checked = state.prework.blocks[id] === true;
    box.addEventListener('change', function () {
      if (box.checked) state.prework.blocks[id] = true;
      else delete state.prework.blocks[id];
      persist();
      renderProgress();
    });
  });

  renderProgress();
})();
