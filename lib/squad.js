/* R2S Lab — contrato da squad `r2s-squad/1` (gates, dossiê A–E e conferências).
 * UMD: no Node é `module.exports`; no navegador vira `window.R2SSquad`. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.R2SSquad = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA_ID = 'r2s-squad/1';
  var GATES = ['G0', 'G1', 'G2', 'G3', 'G4'];
  var ROLES = ['product-lead', 'data-lead', 'ai-engineer', 'eval-risk-lead', 'storyteller'];
  var STATUSES = ['pending', 'in_review', 'passed', 'killed'];
  var DECISIONS = ['escalar', 'iterar', 'encerrar'];
  var DOCS = ['A', 'B', 'C', 'D', 'E'];
  var DOC_FILES = { A: 'A-case-brief.md', B: 'B-adr.md', C: 'C-pitch.md', D: 'D-sis.md', E: 'E-hearing.md' };
  var DOC_NAMES = {
    A: 'case brief (A)', B: 'ADR (B)', C: 'pitch (C)', D: 'Social Impact Statement (D)', E: 'cartão da audiência (E)',
  };
  var PENDING = '[preencher]';
  var TEMPLATE_FIELDS = { A: 14, B: 9, C: 6, D: 9, E: 11 };
  var KILLABLE = ['G0', 'G1', 'G2'];
  var MIN_GOLDEN = 50;

  var HANDLE = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;
  var DATE = /^\d{4}-\d{2}-\d{2}$/;

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isDate(v) { return typeof v === 'string' && DATE.test(v) && !isNaN(Date.parse(v)); }
  function isNumber(v) { return typeof v === 'number' && isFinite(v); }

  function emptyGate(extra) {
    return Object.assign({ status: 'pending', attempts: 0, approvedBy: null, approvedAt: null }, extra || {});
  }

  function emptySquad() {
    return {
      schema: SCHEMA_ID,
      squad: '',
      case: '',
      sponsor: '',
      coach: '',
      members: [],
      gates: {
        G0: emptyGate(),
        G1: emptyGate({ annualValue: null, annualRunCost: null }),
        G2: emptyGate(),
        G3: emptyGate({ costPerTransaction: null }),
        G4: emptyGate({ decision: null }),
      },
      roles: {},
      assets: [],
    };
  }

  function validateSquad(s) {
    var errors = [];
    if (!isObject(s)) return { ok: false, errors: ['O arquivo da squad deve ser um objeto.'] };
    if (s.schema !== SCHEMA_ID) errors.push('schema deve ser ' + SCHEMA_ID + '.');
    ['squad', 'case', 'sponsor', 'coach'].forEach(function (k) {
      if (typeof s[k] !== 'string') errors.push(k + ' deve ser um texto.');
    });
    if (typeof s.coach === 'string' && s.coach && !HANDLE.test(s.coach)) errors.push('coach deve ser um usuário do GitHub.');

    var seenRoles = {};
    var seenHandles = {};
    if (!Array.isArray(s.members) || s.members.length > 5) errors.push('members deve ter no máximo 5 pessoas.');
    else {
      s.members.forEach(function (m, i) {
        if (!isObject(m) || typeof m.github !== 'string' || !HANDLE.test(m.github)) errors.push('Membro ' + (i + 1) + ' com usuário do GitHub inválido.');
        else {
          if (seenHandles[m.github.toLowerCase()]) errors.push('Membro repetido: ' + m.github + '.');
          seenHandles[m.github.toLowerCase()] = true;
        }
        if (!isObject(m) || ROLES.indexOf(m.role) === -1) errors.push('Membro ' + (i + 1) + ' com papel desconhecido.');
        else {
          if (seenRoles[m.role]) errors.push('Papel repetido: ' + m.role + '.');
          seenRoles[m.role] = true;
        }
      });
    }

    if (!isObject(s.gates)) {
      errors.push('gates deve ser um objeto.');
      return { ok: false, errors: errors };
    }
    GATES.forEach(function (g) { if (!isObject(s.gates[g])) errors.push('Falta o gate ' + g + '.'); });
    if (errors.length && GATES.some(function (g) { return !isObject(s.gates[g]); })) return { ok: false, errors: errors };

    var killedBefore = false;
    GATES.forEach(function (g, i) {
      var gate = s.gates[g];
      if (STATUSES.indexOf(gate.status) === -1) errors.push(g + ' com status desconhecido.');
      if (!(typeof gate.attempts === 'number' && Math.floor(gate.attempts) === gate.attempts && gate.attempts >= 0)) errors.push(g + ': attempts deve ser um inteiro maior ou igual a 0.');
      if (gate.approvedBy !== null && typeof gate.approvedBy !== 'string') errors.push(g + ': approvedBy deve ser texto ou nulo.');
      if (gate.approvedAt !== null && !isDate(gate.approvedAt)) errors.push(g + ': approvedAt deve ser AAAA-MM-DD ou nulo.');

      if (killedBefore && gate.status !== 'pending') errors.push(g + ' deve ficar pending depois de um gate encerrado.');
      if (gate.status === 'killed') {
        if (KILLABLE.indexOf(g) === -1) errors.push(g + ' não pode ser encerrado: só G0, G1 ou G2.');
        killedBefore = true;
      }
      if (gate.status === 'passed') {
        if (i > 0 && s.gates[GATES[i - 1]].status !== 'passed') errors.push(g + ' não pode estar aprovado antes do ' + GATES[i - 1] + '.');
        if (!gate.approvedBy) errors.push(g + ' aprovado exige approvedBy.');
        if (!isDate(gate.approvedAt)) errors.push(g + ' aprovado exige approvedAt (AAAA-MM-DD).');
        if (g === 'G2' || g === 'G3') {
          if (typeof s.coach !== 'string' || !HANDLE.test(s.coach)) {
            errors.push(g + ' aprovado exige o coach da squad (usuário do GitHub em coach).');
          } else if (typeof gate.approvedBy === 'string' && gate.approvedBy.toLowerCase() !== s.coach.toLowerCase()) {
            errors.push(g + ' deve ser aprovado pelo coach (' + s.coach + ').');
          }
        }
      }
    });

    var g1 = s.gates.G1;
    if (g1.status === 'passed') {
      if (!isNumber(g1.annualValue) || !isNumber(g1.annualRunCost)) errors.push('G1 aprovado exige o valor anual e o custo anual de run.');
      else if (!(g1.annualValue > 3 * g1.annualRunCost)) errors.push('G1 aprovado exige valor anual maior que 3× o custo anual de run.');
    }
    if (s.gates.G3.status === 'passed' && !(isNumber(s.gates.G3.costPerTransaction) && s.gates.G3.costPerTransaction >= 0)) {
      errors.push('G3 aprovado exige o custo por transação.');
    }
    if (!Array.isArray(s.assets) || s.assets.some(function (a) { return typeof a !== 'string'; })) errors.push('assets deve ser uma lista de textos.');
    if (s.gates.G4.status === 'passed') {
      if (DECISIONS.indexOf(s.gates.G4.decision) === -1) errors.push('G4 aprovado exige decision: escalar, iterar ou encerrar.');
      if (!Array.isArray(s.assets) || s.assets.length < 1) errors.push('G4 aprovado exige pelo menos 1 ativo em assets.');
    }

    if (!isObject(s.roles)) errors.push('roles deve ser um objeto.');
    else {
      Object.keys(s.roles).forEach(function (g) {
        if (['G1', 'G2', 'G3'].indexOf(g) === -1) errors.push('roles só aceita G1, G2 e G3.');
        else if (!isObject(s.roles[g])) errors.push('roles.' + g + ' deve ser um objeto.');
        else {
          Object.keys(s.roles[g]).forEach(function (role) {
            if (ROLES.indexOf(role) === -1) errors.push('roles.' + g + ' com papel desconhecido: ' + role + '.');
            else if (typeof s.roles[g][role] !== 'string' || !HANDLE.test(s.roles[g][role])) errors.push('roles.' + g + '.' + role + ' deve ser um usuário do GitHub.');
          });
        }
      });
      ['G1', 'G2', 'G3'].forEach(function (g) {
        if (s.gates[g].status === 'passed') {
          ROLES.forEach(function (role) {
            if (!(isObject(s.roles[g]) && typeof s.roles[g][role] === 'string' && s.roles[g][role])) {
              errors.push(g + ' aprovado exige o papel ' + role + ' atribuído em roles.' + g + '.');
            }
          });
        }
      });
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function countPending(text) {
    var n = 0;
    var from = 0;
    var s = String(text || '');
    for (;;) {
      var i = s.indexOf(PENDING, from);
      if (i === -1) return n;
      n++;
      from = i + PENDING.length;
    }
  }

  /** Trecho do SIS (D) de uma revisão: 'g2', 'g3' ou 'd90'. Vazio se o título não existir. */
  function section(text, key) {
    var marker = { g2: /G2/, g3: /G3/, d90: /90 dias/ }[key];
    var lines = String(text || '').split('\n');
    var start = -1;
    for (var i = 0; i < lines.length; i++) {
      if (/^##\s+Revisão/.test(lines[i]) && marker.test(lines[i])) { start = i; break; }
    }
    if (start === -1) return '';
    var end = lines.length;
    for (var j = start + 1; j < lines.length; j++) {
      if (/^##\s/.test(lines[j])) { end = j; break; }
    }
    return lines.slice(start, end).join('\n');
  }

  /** Quantas opções do ADR estão preenchidas (a opção marcada [opcional] não conta). */
  function optionsFilled(adr) {
    var lines = String(adr || '').split('\n');
    var count = 0;
    var body = null;
    function close() {
      if (body !== null && body.trim() && body.indexOf(PENDING) === -1 && body.indexOf('[opcional]') === -1) count++;
    }
    lines.forEach(function (line) {
      if (/^##\s+Opção\s+\d+/.test(line)) { close(); body = ''; }
      else if (/^##\s/.test(line)) { close(); body = null; }
      else if (body !== null) body += line + '\n';
    });
    close();
    return count;
  }

  function dossierStatus(texts) {
    var byDoc = {};
    var pending = 0;
    var total = 0;
    DOCS.forEach(function (k) {
      var t = TEMPLATE_FIELDS[k];
      var p = typeof (texts || {})[k] === 'string' ? Math.min(countPending(texts[k]), t) : t;
      byDoc[k] = { pending: p, total: t, percent: t ? Math.round((100 * (t - p)) / t) : 100 };
      pending += p;
      total += t;
    });
    return { byDoc: byDoc, pending: pending, total: total, percent: total ? Math.round((100 * (total - pending)) / total) : 100 };
  }

  function currentGate(s) {
    for (var i = 0; i < GATES.length; i++) {
      var status = s.gates[GATES[i]].status;
      if (status !== 'passed') return { gate: GATES[i], killed: status === 'killed', done: false };
    }
    return { gate: null, killed: false, done: true };
  }

  function pendingMessage(gate, doc, n) {
    return gate + ' aprovado, mas o ' + DOC_NAMES[doc] + ' ainda tem ' + n + (n === 1 ? ' campo pendente.' : ' campos pendentes.');
  }

  /** Erros dos gates aprovados contra os documentos. `files`: { docs, goldenRows }. */
  function squadChecks(s, files) {
    var errors = [];
    var docs = (files && files.docs) || {};
    var golden = (files && files.goldenRows) || 0;
    function pendingOf(k) { return typeof docs[k] === 'string' ? countPending(docs[k]) : TEMPLATE_FIELDS[k]; }
    function passed(g) { return s.gates[g].status === 'passed'; }
    function sectionIncomplete(key) {
      var text = typeof docs.D === 'string' ? section(docs.D, key) : '';
      return !text || countPending(text) > 0;
    }

    ['G0', 'G1'].forEach(function (g) {
      if (passed(g) && pendingOf('A') > 0) errors.push(pendingMessage(g, 'A', pendingOf('A')));
    });
    if (passed('G2')) {
      if (pendingOf('B') > 0) errors.push(pendingMessage('G2', 'B', pendingOf('B')));
      if (optionsFilled(docs.B) < 2) errors.push('G2 aprovado, mas o ADR (B) precisa comparar pelo menos 2 opções.');
      if (sectionIncomplete('g2')) errors.push('G2 aprovado, mas a revisão G2 do Social Impact Statement (D) está incompleta.');
    }
    if (passed('G3')) {
      if (golden < MIN_GOLDEN) errors.push('G3 aprovado, mas o golden set tem ' + golden + ' casos (mínimo ' + MIN_GOLDEN + ').');
      if (sectionIncomplete('g3')) errors.push('G3 aprovado, mas a revisão G3 do Social Impact Statement (D) está incompleta.');
    }
    if (passed('G4') && pendingOf('C') > 0) errors.push(pendingMessage('G4', 'C', pendingOf('C')));
    return errors;
  }

  return {
    SCHEMA_ID: SCHEMA_ID, GATES: GATES, ROLES: ROLES, STATUSES: STATUSES, DECISIONS: DECISIONS, DOCS: DOCS,
    DOC_FILES: DOC_FILES, DOC_NAMES: DOC_NAMES, PENDING: PENDING, TEMPLATE_FIELDS: TEMPLATE_FIELDS, HANDLE: HANDLE,
    emptySquad: emptySquad, validateSquad: validateSquad, countPending: countPending, section: section,
    optionsFilled: optionsFilled, dossierStatus: dossierStatus, currentGate: currentGate, squadChecks: squadChecks,
  };
});
