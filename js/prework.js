/* R2S Lab — página do pre-work. Script clássico (sem módulos), para abrir também por file://. */
(function () {
  'use strict';

  var P = window.R2SProgress;
  var store = window.R2SStore;
  var state = store.load();
  var Q = window.R2SQuizzes;
  var drafts = window.R2SDrafts('r2s-prework-answers-v1');
  var answers = drafts.load();
  var scoreUpdaters = [];

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

    /* As respostas locais mandam; sem elas vale o resultado importado de um arquivo. */
    function updateScore() {
      var local = Q.scoreQuiz(answers[id] || {}, id);
      if (local.answered) state.prework.quizzes[id] = local;
      var s = state.prework.quizzes[id];
      score.textContent = s && s.answered
        ? 'Acertos: ' + s.correct + ' de ' + set.length + (s.answered < set.length ? ' (' + s.answered + ' respondidas)' : '')
        : '';
    }
    scoreUpdaters.push(updateScore);

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

  /* ---------- autoavaliação ---------- */
  var SELF = [
    ['problemFraming', 'Problem framing'],
    ['valueCase', 'Value case'],
    ['stakeholderCommunication', 'Stakeholder communication'],
    ['techniqueSelection', 'Technique selection'],
    ['build', 'Build (RAG, agents, apps)'],
    ['evaluation', 'Evaluation'],
    ['dataReadiness', 'Data readiness'],
    ['responsibleAiFinops', 'Responsible AI e FinOps'],
  ];
  var ROUTES = {
    'lab-zero': 'Com essa média, a regra de placement do lab indicaria começar pelo Lab Zero com pre-work. Confirme no diagnóstico da semana 0.',
    cohort: 'Com essa média, a regra de placement do lab indicaria entrar direto na turma. Confirme no diagnóstico da semana 0.',
    lead: 'Com essa média, a regra de placement do lab indicaria entrar como líder de squad ou coach em formação. Confirme no diagnóstico da semana 0.',
  };

  function selfValues() {
    return SELF.map(function (c, i) { return Number($('#s_' + i).value); });
  }

  function renderSelf() {
    var values = selfValues();
    var avg = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    $$('#selfGrid output.sv').forEach(function (o, i) { o.textContent = values[i]; });
    $('#s_avg').textContent = num1.format(avg);
    $('#s_route').textContent = ROUTES[P.routeForAverage(avg)];
  }

  SELF.forEach(function (c, i) {
    var label = el('label', 'f');
    label.appendChild(document.createTextNode(c[1] + ' '));
    var out = el('output', 'sv', '2');
    out.style.fontWeight = '700';
    label.appendChild(out);
    var range = document.createElement('input');
    range.type = 'range';
    range.min = 1;
    range.max = 4;
    range.step = 1;
    range.id = 's_' + i;
    range.value = state.selfAssessment && state.selfAssessment[c[0]] ? state.selfAssessment[c[0]] : 2;
    range.setAttribute('aria-label', c[1]);
    range.addEventListener('input', function () {
      var values = selfValues();
      state.selfAssessment = {};
      SELF.forEach(function (item, k) { state.selfAssessment[item[0]] = values[k]; });
      persist();
      renderSelf();
    });
    label.appendChild(range);
    $('#selfGrid').appendChild(label);
  });

  /* ---------- exportar, importar e limpar (js/export-ui.js) ---------- */
  function hydrate() {
    $$('input[data-block]').forEach(function (box) { box.checked = state.prework.blocks[box.dataset.block] === true; });
    $('#gh').value = state.github || '';
    SELF.forEach(function (c, i) {
      $('#s_' + i).value = state.selfAssessment && state.selfAssessment[c[0]] ? state.selfAssessment[c[0]] : 2;
    });
    renderSelf();
    scoreUpdaters.forEach(function (update) { update(); });
    renderProgress();
  }

  window.R2SExportUI.init({
    store: store,
    getState: function () { return state; },
    setState: function (next) { state = next; },
    persist: persist,
    hydrate: hydrate,
    clearDrafts: function () { drafts.clear(); fields.clear(); },
  });

  recalc();
  renderSelf();
  renderProgress();
})();
