/* R2S Lab — contrato de progresso `r2s-progress/1`.
 * UMD: no Node é `module.exports`; no navegador vira `window.R2SProgress`. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.R2SProgress = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA_ID = 'r2s-progress/1';

  var PREWORK_BLOCKS = [
    { id: '1.1', part: 1, min: 45, title: 'Como um LLM gera texto' },
    { id: '1.2', part: 1, min: 60, title: 'Prompting que funciona' },
    { id: '1.3', part: 1, min: 45, title: 'Regra, ML, LLM ou agente?' },
    { id: '2.1', part: 2, min: 30, title: 'Anatomia de um pedido vago' },
    { id: '2.2', part: 2, min: 45, title: 'Métrica, baseline, meta e escopo' },
    { id: '2.3', part: 2, min: 30, title: 'Árvore de KPI' },
    { id: '3.1', part: 3, min: 25, title: 'Três tipos de valor' },
    { id: '3.2', part: 3, min: 25, title: 'Custo de build e custo de run' },
    { id: '3.3', part: 3, min: 40, title: 'Calculadora: o caso passa no G1?' },
    { id: '4.1', part: 4, min: 30, title: 'Quem responde pelo erro' },
    { id: '4.2', part: 4, min: 45, title: 'Um pitch de 10 minutos que termina em decisão' },
    { id: '5.1', part: 5, min: 40, title: 'Seu case brief' },
    { id: '5.2', part: 5, min: 20, title: 'Autoavaliação e fechamento' },
  ];

  var TOTAL_MIN = PREWORK_BLOCKS.reduce(function (a, b) { return a + b.min; }, 0);

  var QUIZ_IDS = ['m1_llm', 'm1_prompt', 'm1_tech', 'm2_mc', 'm2_class', 'm3_types', 'm3_g1', 'm3_adopt', 'm4_rai'];

  var COMPETENCIES = [
    'problemFraming', 'valueCase', 'stakeholderCommunication', 'techniqueSelection',
    'build', 'evaluation', 'dataReadiness', 'responsibleAiFinops',
  ];

  var RATINGS = ['conteudo', 'hands', 'mentoria', 'carga', 'patroc', 'demo', 'prework', 'conf'];

  var CONSENTS = ['nao', 'anon', 'nome'];
  var HANDLE = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isInt(v, min, max) { return typeof v === 'number' && Math.floor(v) === v && v >= min && v <= max; }
  function isIso(v) { return typeof v === 'string' && !isNaN(Date.parse(v)); }
  function blockIds() { return PREWORK_BLOCKS.map(function (b) { return b.id; }); }

  function emptyProgress(github) {
    return {
      schema: SCHEMA_ID,
      github: github || '',
      updatedAt: new Date().toISOString(),
      prework: { blocks: {}, quizzes: {} },
      selfAssessment: null,
      survey: null,
    };
  }

  function validateProgress(p) {
    var errors = [];
    if (!isObject(p)) return { ok: false, errors: ['O progresso deve ser um objeto.'] };
    if (p.schema !== SCHEMA_ID) errors.push('schema deve ser ' + SCHEMA_ID + '.');
    if (typeof p.github !== 'string' || !HANDLE.test(p.github)) errors.push('Usuário do GitHub inválido.');
    if (!isIso(p.updatedAt)) errors.push('updatedAt deve ser uma data ISO.');

    var pre = p.prework;
    if (!isObject(pre) || !isObject(pre.blocks) || !isObject(pre.quizzes)) {
      errors.push('prework deve ter blocks e quizzes.');
    } else {
      var ids = blockIds();
      Object.keys(pre.blocks).forEach(function (id) {
        if (ids.indexOf(id) === -1) errors.push('Bloco desconhecido: ' + id + '.');
        else if (pre.blocks[id] !== true) errors.push('Bloco ' + id + ' deve ser true.');
      });
      Object.keys(pre.quizzes).forEach(function (id) {
        var q = pre.quizzes[id];
        if (QUIZ_IDS.indexOf(id) === -1) errors.push('Quiz desconhecido: ' + id + '.');
        else if (!isObject(q) || !isInt(q.answered, 0, 1e6) || !isInt(q.correct, 0, 1e6) || q.correct > q.answered) {
          errors.push('Quiz ' + id + ' inválido.');
        }
      });
    }

    if (p.selfAssessment !== null) {
      if (!isObject(p.selfAssessment)) errors.push('selfAssessment deve ser nulo ou um objeto.');
      else {
        Object.keys(p.selfAssessment).forEach(function (k) {
          if (COMPETENCIES.indexOf(k) === -1) errors.push('Competência desconhecida: ' + k + '.');
          else if (!isInt(p.selfAssessment[k], 1, 4)) errors.push('Competência ' + k + ' deve ir de 1 a 4.');
        });
      }
    }

    if (p.survey !== null) {
      var s = p.survey;
      if (!isObject(s)) errors.push('survey deve ser nulo ou um objeto.');
      else {
        if (!isInt(s.nps, 0, 10)) errors.push('nps deve ir de 0 a 10.');
        if (!isObject(s.ratings)) errors.push('ratings deve ser um objeto.');
        else {
          RATINGS.forEach(function (k) {
            if (!(k in s.ratings)) errors.push('ratings deve ter as 8 notas (falta ' + k + ').');
            else if (!isInt(s.ratings[k], 1, 5)) errors.push('Nota ' + k + ' deve ir de 1 a 5.');
          });
        }
        if (typeof s.hoursPerWeek !== 'number' || !(s.hoursPerWeek >= 0)) errors.push('hoursPerWeek deve ser um número maior ou igual a 0.');
        if (!isObject(s.open) || ['melhor', 'mudar', 'aplicou'].some(function (k) { return typeof s.open[k] !== 'string'; })) {
          errors.push('open deve ter melhor, mudar e aplicou como texto.');
        }
        if (CONSENTS.indexOf(s.consent) === -1) errors.push('consent deve ser nao, anon ou nome.');
        if (!isIso(s.submittedAt)) errors.push('submittedAt deve ser uma data ISO.');
      }
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function preworkMinutes(p) {
    var blocks = (p && p.prework && p.prework.blocks) || {};
    return PREWORK_BLOCKS.reduce(function (a, b) { return a + (blocks[b.id] === true ? b.min : 0); }, 0);
  }

  function mergeProgress(base, patch) {
    return Object.assign({}, base, patch);
  }

  function routeForAverage(avg) {
    if (avg <= 1.5) return 'lab-zero';
    if (avg <= 2.5) return 'cohort';
    return 'lead';
  }

  function npsCategory(n) {
    if (n >= 9) return 'promoter';
    if (n >= 7) return 'passive';
    return 'detractor';
  }

  /**
   * Monta a seção `survey` a partir dos rascunhos da página (respostas ainda incompletas).
   * Devolve `{ok: false, missing}` com as chaves que faltam (na ordem do formulário) ou `{ok: true, survey}`.
   */
  function surveyFromDraft(draft, now) {
    var d = draft || {};
    var missing = [];
    if (!isInt(d.nps, 0, 10)) missing.push('nps');
    var ratings = {};
    RATINGS.forEach(function (k) {
      var v = d.ratings && d.ratings[k];
      if (isInt(v, 1, 5)) ratings[k] = v;
      else missing.push(k);
    });
    var raw = d.hoursPerWeek === undefined || d.hoursPerWeek === null ? '' : String(d.hoursPerWeek).trim();
    var hours = raw === '' ? NaN : parseFloat(raw.replace(',', '.'));
    if (!isFinite(hours) || hours < 0) missing.push('hoursPerWeek');
    if (CONSENTS.indexOf(d.consent) === -1) missing.push('consent');
    if (missing.length) return { ok: false, missing: missing };
    var open = d.open || {};
    return {
      ok: true,
      survey: {
        nps: d.nps,
        ratings: ratings,
        hoursPerWeek: hours,
        open: {
          melhor: String(open.melhor || ''),
          mudar: String(open.mudar || ''),
          aplicou: String(open.aplicou || ''),
        },
        consent: d.consent,
        submittedAt: (now || new Date()).toISOString(),
      },
    };
  }

  return {
    surveyFromDraft: surveyFromDraft,
    SCHEMA_ID: SCHEMA_ID, TOTAL_MIN: TOTAL_MIN, PREWORK_BLOCKS: PREWORK_BLOCKS, QUIZ_IDS: QUIZ_IDS,
    COMPETENCIES: COMPETENCIES, RATINGS: RATINGS, CONSENTS: CONSENTS, HANDLE: HANDLE,
    emptyProgress: emptyProgress, validateProgress: validateProgress, preworkMinutes: preworkMinutes,
    mergeProgress: mergeProgress, routeForAverage: routeForAverage, npsCategory: npsCategory,
  };
});
