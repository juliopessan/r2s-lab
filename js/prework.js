/* R2S Lab — página do pre-work. Script clássico (sem módulos), para abrir também por file://. */
(function () {
  'use strict';

  var P = window.R2SProgress;
  var store = window.R2SStore;
  var state = store.load();
  var Q = window.R2SQuizzes;
  var drafts = window.R2SDrafts('r2s-prework-answers-v1');
  var answers = drafts.load();

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

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }

  function renderQuiz(box) {
    var id = box.dataset.quiz;
    var set = Q.QUIZZES[id];
    if (!set) return;
    box.appendChild(el('h4', null, box.dataset.title || 'Checagem rápida'));
    var score = el('p', 'score');

    function updateScore() {
      var s = Q.scoreQuiz(answers[id] || {}, id);
      score.textContent = s.answered
        ? 'Acertos: ' + s.correct + ' de ' + set.length + (s.answered < set.length ? ' (' + s.answered + ' respondidas)' : '')
        : '';
      if (s.answered) state.prework.quizzes[id] = s;
      else delete state.prework.quizzes[id];
    }

    set.forEach(function (q, i) {
      var wrap = el('div', 'q');
      wrap.appendChild(el('p', null, q.q));
      var opts = el('div', 'opts');
      var fb = el('p', 'fb');
      fb.setAttribute('role', 'status');
      var buttons = [];

      function reveal(v) {
        buttons.forEach(function (b, j) {
          b.disabled = true;
          if (j === q.a) b.classList.add('right');
          else if (j === v) b.classList.add('wrong');
        });
        fb.textContent = '';
        fb.appendChild(el('b', v === q.a ? 'ok' : 'no', v === q.a ? 'Correto. ' : 'Não é essa. A resposta é “' + q.o[q.a] + '”. '));
        fb.appendChild(document.createTextNode(q.w));
      }

      q.o.forEach(function (text, j) {
        var b = el('button', 'opt', text);
        b.type = 'button';
        buttons.push(b);
        b.addEventListener('click', function () {
          answers[id] = answers[id] || {};
          answers[id][i] = j;
          drafts.save(answers);
          reveal(j);
          updateScore();
          persist();
        });
        opts.appendChild(b);
      });

      wrap.appendChild(opts);
      wrap.appendChild(fb);
      box.appendChild(wrap);
      var previous = (answers[id] || {})[i];
      if (previous !== undefined && previous !== null) reveal(previous);
    });

    box.appendChild(score);
    updateScore();
  }

  $$('[data-quiz]').forEach(renderQuiz);

  renderProgress();
})();
