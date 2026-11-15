/* R2S Lab — contrato de avaliação `r2s-assessment/1`: rubrica da squad, evidências individuais, nota final e níveis.
 * UMD: no Node é `module.exports`; no navegador vira `window.R2SAssessment`. */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory(isNode ? require('./progress.js') : root.R2SProgress);
  if (isNode) module.exports = api;
  else root.R2SAssessment = api;
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';

  var SCHEMA_ID = 'r2s-assessment/1';
  var RUBRIC = [
    { key: 'framing', weight: 25 },
    { key: 'design', weight: 20 },
    { key: 'engineering', weight: 20 },
    { key: 'evaluation', weight: 15 },
    { key: 'cost', weight: 10 },
    { key: 'communication', weight: 10 },
  ];
  var COMPETENCIES = P.COMPETENCIES;
  var HANDLE = P.HANDLE;
  var EPS = 1e-9;
  var MEMBER_KEYS = [
    'labZeroCompleted', 'knowledgeCheckPct', 'coachObservation', 'peerReview', 'attendancePct',
    'competencies', 'coachedNextCohort', 'assetReused',
  ];

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isScore(v) { return v === null || (typeof v === 'number' && Math.floor(v) === v && v >= 1 && v <= 4); }
  function isPct(v) { return v === null || (isNum(v) && v >= 0 && v <= 100); }

  function emptyMember() {
    return {
      labZeroCompleted: false,
      knowledgeCheckPct: null,
      coachObservation: null,
      peerReview: null,
      attendancePct: null,
      competencies: { diagnostic: null, final: null },
      coachedNextCohort: false,
      assetReused: false,
    };
  }

  function emptyAssessment() {
    var rubric = {};
    RUBRIC.forEach(function (d) { rubric[d.key] = null; });
    return {
      schema: SCHEMA_ID,
      squadRubric: rubric,
      sandbox: { capUsd: 300, spentUsd: null },
      members: {},
    };
  }

  function validCompetencies(c) {
    if (c === null) return true;
    if (!isObject(c)) return false;
    var keys = Object.keys(c);
    if (keys.length !== COMPETENCIES.length) return false;
    return COMPETENCIES.every(function (k) { return k in c && isScore(c[k]) && c[k] !== null; });
  }

  function validateAssessment(a) {
    var errors = [];
    if (!isObject(a)) return { ok: false, errors: ['A avaliação deve ser um objeto.'] };
    if (a.schema !== SCHEMA_ID) errors.push('schema deve ser ' + SCHEMA_ID + '.');
    Object.keys(a).forEach(function (k) {
      if (['schema', 'squadRubric', 'sandbox', 'members'].indexOf(k) === -1) errors.push('Campo desconhecido: ' + k + '.');
    });

    if (!isObject(a.squadRubric)) errors.push('squadRubric deve ser um objeto.');
    else {
      var known = RUBRIC.map(function (d) { return d.key; });
      Object.keys(a.squadRubric).forEach(function (k) {
        if (known.indexOf(k) === -1) errors.push('Dimensão desconhecida na rubrica: ' + k + '.');
        else if (!isScore(a.squadRubric[k])) errors.push('Nota da dimensão ' + k + ' deve ir de 1 a 4 ou ser nula.');
      });
      known.forEach(function (k) { if (!(k in a.squadRubric)) errors.push('Falta a dimensão ' + k + ' na rubrica.'); });
    }

    if (!isObject(a.sandbox) || !isNum(a.sandbox.capUsd) || a.sandbox.capUsd < 0 ||
        !(a.sandbox.spentUsd === null || (isNum(a.sandbox.spentUsd) && a.sandbox.spentUsd >= 0))) {
      errors.push('sandbox deve ter capUsd ≥ 0 e spentUsd nulo ou ≥ 0.');
    }

    if (!isObject(a.members)) errors.push('members deve ser um objeto.');
    else {
      Object.keys(a.members).forEach(function (handle) {
        var m = a.members[handle];
        var who = 'Membro ' + handle + ': ';
        if (!HANDLE.test(handle)) { errors.push(who + 'usuário do GitHub inválido.'); return; }
        if (!isObject(m)) { errors.push(who + 'deve ser um objeto.'); return; }
        Object.keys(m).forEach(function (k) { if (MEMBER_KEYS.indexOf(k) === -1) errors.push(who + 'campo desconhecido ' + k + '.'); });
        ['labZeroCompleted', 'coachedNextCohort', 'assetReused'].forEach(function (k) {
          if (typeof m[k] !== 'boolean') errors.push(who + k + ' deve ser verdadeiro ou falso.');
        });
        ['knowledgeCheckPct', 'attendancePct'].forEach(function (k) {
          if (!isPct(m[k])) errors.push(who + k + ' deve ir de 0 a 100 ou ser nulo.');
        });
        ['coachObservation', 'peerReview'].forEach(function (k) {
          if (!isScore(m[k])) errors.push(who + k + ' deve ir de 1 a 4 ou ser nulo.');
        });
        if (!isObject(m.competencies) || !validCompetencies(m.competencies.diagnostic) || !validCompetencies(m.competencies.final)) {
          errors.push(who + 'competencies deve ter diagnostic e final nulos ou com as 8 competências de 1 a 4.');
        }
      });
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /** Média ponderada da rubrica; null se faltar uma dimensão. */
  function squadScore(r) {
    var sum = 0;
    for (var i = 0; i < RUBRIC.length; i++) {
      var v = r && r[RUBRIC[i].key];
      if (typeof v !== 'number') return null;
      sum += (RUBRIC[i].weight * v) / 100;
    }
    return sum;
  }

  /** 50% coach, 25% pares e 25% prova (a prova de 0–100% vira 1–4: 1 + 3 × pct/100). */
  function individualScore(m) {
    if (!m || typeof m.coachObservation !== 'number' || typeof m.peerReview !== 'number' || typeof m.knowledgeCheckPct !== 'number') return null;
    return 0.5 * m.coachObservation + 0.25 * m.peerReview + 0.25 * (1 + (3 * m.knowledgeCheckPct) / 100);
  }

  function finalScore(squad, indiv) {
    if (squad === null || indiv === null || squad === undefined || indiv === undefined) return null;
    return 0.6 * squad + 0.4 * indiv;
  }

  function levelFor(m, rubric) {
    var foundation = m.labZeroCompleted === true && typeof m.knowledgeCheckPct === 'number' && m.knowledgeCheckPct >= 70;
    var dims = RUBRIC.map(function (d) { return rubric && rubric[d.key]; });
    var complete = dims.every(function (v) { return typeof v === 'number'; });
    var final = finalScore(squadScore(rubric), individualScore(m));
    var practitioner = final !== null && final + EPS >= 3 && complete && Math.min.apply(null, dims) >= 2;
    if (practitioner && m.coachedNextCohort === true && m.assetReused === true) return 'lead';
    if (practitioner) return 'practitioner';
    if (foundation) return 'foundation';
    return 'none';
  }

  /** Crescimento médio entre o diagnóstico e o final; null se algum dos dois estiver incompleto. */
  function competencyGain(m) {
    var c = m && m.competencies;
    if (!c || !validCompetencies(c.diagnostic) || !validCompetencies(c.final) || c.diagnostic === null || c.final === null) return null;
    var total = 0;
    COMPETENCIES.forEach(function (k) { total += c.final[k] - c.diagnostic[k]; });
    return total / COMPETENCIES.length;
  }

  return {
    SCHEMA_ID: SCHEMA_ID, RUBRIC: RUBRIC, COMPETENCIES: COMPETENCIES,
    emptyAssessment: emptyAssessment, emptyMember: emptyMember, validateAssessment: validateAssessment,
    squadScore: squadScore, individualScore: individualScore, finalScore: finalScore,
    levelFor: levelFor, competencyGain: competencyGain,
  };
});
