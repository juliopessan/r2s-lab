/* R2S Lab — página do certificado. Script clássico; o rascunho vive só neste navegador. */
(function () {
  'use strict';

  var drafts = window.R2SDrafts('r2s-cert-draft-v1');
  var DEFAULTS = {
    c_texto: 'concluiu o R2S Lab, laboratório de IA aplicada a negócio, entregando um caso real com métrica, baseline, avaliação, custo por transação e uma recomendação de decisão ao painel executivo.',
    c_comp: 'Problem framing · Value case · Seleção de técnica · Avaliação · Responsible AI e FinOps',
    c_r1: 'Coordenação do R2S Lab',
  };
  var FIELDS = ['c_nome', 'c_turma', 'c_data', 'c_horas', 'c_nivel', 'c_texto', 'c_comp', 'c_s1', 'c_r1', 'c_s2', 'c_r2'];
  var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function $(id) { return document.getElementById(id); }
  function val(id) { return ($(id).value || '').trim(); }

  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return '';
    var month = Number(m[2]);
    if (month < 1 || month > 12) return '';
    return Number(m[3]) + ' de ' + MONTHS[month - 1] + ' de ' + m[1];
  }

  function show(id, on) { $(id).hidden = !on; }

  function render() {
    $('cv_nome').textContent = val('c_nome') || 'Nome do colaborador';
    var parts = [val('c_texto')];
    if (val('c_turma')) parts.push('Turma ' + val('c_turma') + '.');
    if (val('c_horas')) parts.push('Carga horária: ' + val('c_horas') + ' horas.');
    $('cv_texto').textContent = parts.filter(Boolean).join(' ');
    var level = val('c_nivel');
    $('cv_nivel').textContent = level ? 'Nível: ' + level : '';
    show('cv_nivel', Boolean(level));
    $('cv_comp').textContent = val('c_comp');
    $('cv_data').textContent = longDate(val('c_data'));
    [1, 2].forEach(function (n) {
      var name = val('c_s' + n);
      var role = val('c_r' + n);
      $('cv_s' + n).textContent = name;
      $('cv_r' + n).textContent = role;
      show('cv_sig' + n, Boolean(name || role));
    });
  }

  function save() {
    var draft = {};
    FIELDS.forEach(function (id) { draft[id] = $(id).value; });
    drafts.save(draft);
  }

  var draft = drafts.load();
  FIELDS.forEach(function (id) {
    var saved = draft[id];
    $(id).value = typeof saved === 'string' ? saved : (DEFAULTS[id] || '');
    $(id).addEventListener('input', function () { render(); save(); });
    $(id).addEventListener('change', function () { render(); save(); });
  });
  $('printBtn').addEventListener('click', function () { window.print(); });
  render();
})();
