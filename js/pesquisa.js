/* R2S Lab — pesquisa de satisfação. Script clássico (sem módulos), para abrir também por file://. */
(function () {
  'use strict';

  var P = window.R2SProgress;
  var store = window.R2SStore;
  var drafts = window.R2SDrafts('r2s-survey-draft-v1');
  var state = store.load();
  var draft = drafts.load();

  var RATES = [
    ['conteudo', 'Conteúdo e exercícios'],
    ['hands', 'Hands-on com caso real'],
    ['mentoria', 'Mentoria e coaching'],
    ['carga', 'Carga e ritmo semanal'],
    ['patroc', 'Engajamento do patrocinador do caso'],
    ['demo', 'Demo day e feedback do painel'],
    ['prework', 'Pre-work (preparação)'],
    ['conf', 'Confiança para conduzir um caso novo sozinho'],
  ];
  var OPEN = [
    ['melhor', 'aberta-melhor', 'O que mais valeu a pena? Cite um momento ou entregável.'],
    ['mudar', 'aberta-mudar', 'O que você mudaria primeiro? Uma coisa só.'],
    ['aplicou', 'aberta-aplicou', 'O que você já aplicou no seu trabalho depois do lab?'],
  ];
  var CONSENT = [['nao', 'Não'], ['anon', 'Sim, sem meu nome'], ['nome', 'Sim, com meu nome']];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }

  /* Se não há rascunho mas há uma pesquisa no estado (por exemplo, depois de importar), parte dela. */
  function draftFromSurvey(survey) {
    return {
      nps: survey.nps,
      ratings: Object.assign({}, survey.ratings),
      hoursPerWeek: String(survey.hoursPerWeek),
      open: Object.assign({}, survey.open),
      consent: survey.consent,
    };
  }
  if (!Object.keys(draft).length && state.survey) draft = draftFromSurvey(state.survey);
  draft.ratings = draft.ratings || {};
  draft.open = draft.open || {};

  function commit() {
    drafts.save(draft);
    var result = P.surveyFromDraft(draft);
    state.survey = result.ok ? result.survey : null;
    state.updatedAt = new Date().toISOString();
    store.save(state);
  }

  /* ---------- formulário ---------- */
  var form = $('#surveyForm');

  function scale(name, from, to, lowLabel, highLabel, current, onPick) {
    var wrap = el('div');
    var group = el('div', 'scale');
    group.setAttribute('role', 'radiogroup');
    for (var i = from; i <= to; i++) {
      (function (i) {
        var label = el('label');
        var input = document.createElement('input');
        input.type = 'radio';
        input.name = name;
        input.value = String(i);
        input.setAttribute('aria-label', i + (i === from ? ' (' + lowLabel + ')' : i === to ? ' (' + highLabel + ')' : ''));
        input.checked = current === i;
        input.addEventListener('change', function () { onPick(i); });
        label.appendChild(input);
        label.appendChild(el('span', null, String(i)));
        group.appendChild(label);
      })(i);
    }
    wrap.appendChild(group);
    var ends = el('div', 'ends');
    ends.appendChild(el('span', null, lowLabel));
    ends.appendChild(el('span', null, highLabel));
    wrap.appendChild(ends);
    return wrap;
  }

  var npsSet = el('fieldset', 'nps');
  npsSet.appendChild(el('legend', null, 'De 0 a 10, qual a chance de você recomendar o R2S Lab a um colega?'));
  npsSet.appendChild(scale('nps', 0, 10, 'nenhuma', 'certeza', draft.nps, function (v) { draft.nps = v; commit(); }));
  form.appendChild(npsSet);

  var rateSet = el('fieldset');
  rateSet.appendChild(el('legend', null, 'Avalie cada ponto de 1 a 5'));
  RATES.forEach(function (r) {
    var row = el('div', 'rating-row');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', r[1]);
    row.appendChild(el('div', 'rating-label', r[1]));
    row.appendChild(scale('r_' + r[0], 1, 5, 'fraco', 'excelente', draft.ratings[r[0]], function (v) {
      draft.ratings[r[0]] = v;
      commit();
    }));
    rateSet.appendChild(row);
  });
  form.appendChild(rateSet);

  var hoursSet = el('fieldset');
  var hoursLabel = el('label', 'f');
  hoursLabel.appendChild(document.createTextNode('Quantas horas por semana o lab realmente tomou de você, em média?'));
  var hours = document.createElement('input');
  hours.type = 'number';
  hours.id = 'horas';
  hours.min = 0;
  hours.step = 1;
  hours.value = draft.hoursPerWeek === undefined || draft.hoursPerWeek === null ? '' : draft.hoursPerWeek;
  hours.addEventListener('input', function () { draft.hoursPerWeek = hours.value; commit(); });
  hoursLabel.appendChild(hours);
  hoursSet.appendChild(hoursLabel);
  form.appendChild(hoursSet);

  OPEN.forEach(function (o) {
    var set = el('fieldset', 'open-question');
    var label = el('label', 'f');
    label.appendChild(el('span', 'open-label', o[2]));
    var area = document.createElement('textarea');
    area.id = o[1];
    area.value = draft.open[o[0]] || '';
    area.addEventListener('input', function () { draft.open[o[0]] = area.value; commit(); });
    label.appendChild(area);
    set.appendChild(label);
    form.appendChild(set);
  });

  var consentSet = el('fieldset');
  consentSet.appendChild(el('legend', null, 'Podemos citar seus comentários em materiais de divulgação?'));
  var radios = el('div', 'radios');
  CONSENT.forEach(function (c) {
    var label = el('label');
    var input = document.createElement('input');
    input.type = 'radio';
    input.name = 'consent';
    input.value = c[0];
    input.checked = draft.consent === c[0];
    input.addEventListener('change', function () { draft.consent = c[0]; commit(); });
    label.appendChild(input);
    label.appendChild(document.createTextNode(c[1]));
    radios.appendChild(label);
  });
  consentSet.appendChild(radios);
  form.appendChild(consentSet);

  /* ---------- importar, exportar e limpar ---------- */
  function hydrate() {
    drafts.clear();
    draft = state.survey ? draftFromSurvey(state.survey) : {};
    draft.ratings = draft.ratings || {};
    draft.open = draft.open || {};
    drafts.save(draft);

    $$('input[name="nps"]').forEach(function (i) { i.checked = Number(i.value) === draft.nps; });
    RATES.forEach(function (r) {
      $$('input[name="r_' + r[0] + '"]').forEach(function (i) { i.checked = Number(i.value) === draft.ratings[r[0]]; });
    });
    hours.value = draft.hoursPerWeek === undefined ? '' : draft.hoursPerWeek;
    OPEN.forEach(function (o) { $('#' + o[1]).value = draft.open[o[0]] || ''; });
    $$('input[name="consent"]').forEach(function (i) { i.checked = i.value === draft.consent; });
    $('#gh').value = state.github || '';
  }

  var MISSING_LABELS = { nps: 'NPS', hoursPerWeek: 'Horas por semana', consent: 'consentimento de citação' };
  RATES.forEach(function (r) { MISSING_LABELS[r[0]] = r[1]; });

  window.R2SExportUI.init({
    store: store,
    getState: function () { return state; },
    setState: function (next) { state = next; },
    persist: function () { commit(); },
    hydrate: hydrate,
    clearDrafts: function () { drafts.clear(); },
    validate: function () {
      var result = P.surveyFromDraft(draft);
      return result.ok ? [] : result.missing.map(function (key) { return MISSING_LABELS[key]; });
    },
  });
})();
