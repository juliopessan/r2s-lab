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

  /* ---------- ferramentas (prompt, custo, valor, pedido, brief) ---------- */
  var calc = window.R2SCalc;
  var fields = window.R2SDrafts('r2s-prework-fields-v1');
  var typed = fields.load();
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var brl4 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });
  var num1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  var PROMPT_FIELDS = ['pr_papel', 'pr_contexto', 'pr_tarefa', 'pr_formato', 'pr_exemplo', 'pr_escape'];
  var BRIEF_FIELDS = ['b_nome', 'b_decide', 'b_req', 'b_metrica', 'b_base', 'b_meta', 'b_tipo', 'b_valor', 'b_dados', 'b_restr'];
  var COPY_FALLBACK = 'Selecione o texto e copie com Ctrl+C (ou Cmd+C).';

  function num(id) { var v = parseFloat($('#' + id).value); return isFinite(v) ? v : 0; }
  function val(id) { return $('#' + id).value.trim(); }
  function filled(ids) { return ids.filter(function (id) { return val(id); }).length; }

  function buildPrompt() {
    var lines = [];
    if (val('pr_papel')) lines.push('Você é ' + val('pr_papel') + '.');
    if (val('pr_contexto')) lines.push('Contexto: ' + val('pr_contexto'));
    if (val('pr_tarefa')) lines.push('Tarefa: ' + val('pr_tarefa'));
    if (val('pr_formato')) lines.push('Formato da resposta: ' + val('pr_formato'));
    if (val('pr_exemplo')) lines.push('Exemplo de uma boa resposta:\n' + val('pr_exemplo'));
    if (val('pr_escape')) lines.push(val('pr_escape'));
    return lines.join('\n\n');
  }

  function renderVerdict(g, run) {
    var box = $('#v_ver');
    box.replaceChildren();
    if (run <= 0) {
      box.className = 'verdict';
      box.textContent = 'Informe o custo anual de run para comparar.';
    } else if (g.passes) {
      box.className = 'verdict ok';
      box.appendChild(el('strong', 'ok', 'Passa no G1. '));
      box.appendChild(document.createTextNode('O valor anual excede 3× o custo de run por ' + brl.format(g.value - g.threshold) +
        '. Se a adoção cair, esta folga encolhe: teste um cenário mais pessimista.'));
    } else {
      box.className = 'verdict no';
      box.appendChild(el('strong', 'no', 'Ainda não passa no G1. '));
      box.appendChild(document.createTextNode('Faltam ' + brl.format(g.shortfall) + ' de valor anual, ou o custo de run teria de cair para ' +
        brl.format(g.value / 3) + ' por ano.'));
    }
  }

  function recalc() {
    var prompt = buildPrompt();
    $('#pr_out').textContent = prompt || 'Preencha os campos para ver o prompt montado.';
    $('#pr_stat').textContent = filled(PROMPT_FIELDS) + ' de 6 partes preenchidas · ' + prompt.length + ' caracteres';

    var per = calc.costPerTransaction({
      tokensIn: num('c_in'), tokensOut: num('c_out'), priceIn: num('c_pin'), priceOut: num('c_pout'), calls: num('c_calls'),
    });
    $('#c_tx').textContent = brl4.format(per);
    $('#c_mo').textContent = brl.format(per * num('c_vol'));
    $('#c_yr').textContent = brl.format(per * num('c_vol') * 12);

    var run = num('v_run');
    var g = calc.g1Value({ tx: num('v_tx'), minutes: num('v_min'), hourCost: num('v_h'), adoptionPct: num('v_ad'), runCost: run });
    $('#v_val').textContent = brl.format(g.value);
    $('#v_thr').textContent = brl.format(g.threshold);
    $('#v_mul').textContent = g.multiple === null ? '—' : num1.format(g.multiple) + '×';
    renderVerdict(g, run);

    var decision = $('#ask_dec').value;
    var need = val('ask_need');
    $('#ask_out').textContent = decision
      ? 'Peço que o painel decida ' + decision.toLowerCase() + ' este caso' +
        (need ? ': ' + need + '.' : '. O que é preciso: [complete o campo ao lado].')
      : 'Escolha uma decisão e diga o que é preciso.';

    $('#b_stat').textContent = filled(BRIEF_FIELDS) + ' de ' + BRIEF_FIELDS.length + ' campos preenchidos';
  }

  $$('[data-persist]').forEach(function (field) {
    if (typed[field.id] !== undefined && typed[field.id] !== null) field.value = typed[field.id];
    var onChange = function () {
      typed[field.id] = field.value;
      fields.save(typed);
      recalc();
    };
    field.addEventListener('input', onChange);
    field.addEventListener('change', onChange);
  });

  function selectNode(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  $('#pr_copy').addEventListener('click', function () {
    var stat = $('#pr_stat');
    function done(message) {
      stat.textContent = message;
      setTimeout(recalc, 2500);
    }
    function fallback() {
      selectNode($('#pr_out'));
      done(COPY_FALLBACK);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(buildPrompt()).then(function () { done('Copiado.'); }, fallback);
    } else {
      fallback();
    }
  });

  recalc();
  renderProgress();
})();
