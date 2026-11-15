/* Painel R2S Lab. Script clássico: lê `window.R2S_DATA` (data.js) e monta a página.
 * Todo texto vindo de participantes entra por `textContent`, nunca como HTML. */
(function () {
  'use strict';

  var data = window.R2S_DATA;

  function $(s) { return document.querySelector(s); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  if (!data) {
    $('#error').hidden = false;
    return;
  }
  $('#app').hidden = false;

  var nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var fmt1 = function (v) { return v === null || v === undefined ? '—' : nf1.format(v); };
  var date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

  var RATING_LABELS = [
    ['conteudo', 'Conteúdo e exercícios'],
    ['hands', 'Hands-on com caso real'],
    ['mentoria', 'Mentoria e coaching'],
    ['carga', 'Carga e ritmo semanal'],
    ['patroc', 'Engajamento do patrocinador do caso'],
    ['demo', 'Demo day e feedback do painel'],
    ['prework', 'Pre-work (preparação)'],
    ['conf', 'Confiança para conduzir um caso novo sozinho'],
  ];
  var THEME_LABELS = [
    ['all', 'Todos'], ['carga', 'Carga e tempo'], ['mentoria', 'Mentoria'], ['conteudo', 'Conteúdo'],
    ['sponsor', 'Patrocinador'], ['ferramentas', 'Ferramentas e ambiente'], ['demo', 'Demo day'], ['outros', 'Outros'],
  ];
  var TOPIC_LABELS = { melhor: 'O que valeu a pena', mudar: 'O que mudar primeiro', aplicou: 'O que já aplicou' };
  var themeName = {};
  THEME_LABELS.forEach(function (t) { themeName[t[0]] = t[1]; });

  /* ---------- aviso de pessoas não lidas ---------- */
  var unreadCount = data.totals.unread || 0;
  if (unreadCount > 0) {
    var banner = $('#unread-banner');
    banner.textContent = unreadCount === 1
      ? '1 pessoa não pôde ser lida (acesso ou erro da API); os números abaixo estão incompletos.'
      : unreadCount + ' pessoas não puderam ser lidas (acesso ou erro da API); os números abaixo estão incompletos.';
    banner.hidden = false;
  }

  /* ---------- visão geral ---------- */
  $('#generated').textContent = 'Gerado em ' + date.format(new Date(data.generatedAt));
  $('#kpi-invited').textContent = String(data.totals.invited);
  $('#kpi-started').textContent = String(data.totals.started);
  $('#kpi-done').textContent = String(data.totals.preworkDone);
  $('#kpi-missing').textContent = String(data.totals.missing);
  $('#kpi-target').textContent = String(data.target);

  /* ---------- funil ---------- */
  var funnel = $('#funnel');
  data.funnel.forEach(function (stage) {
    var pct = data.totals.invited > 0 ? (100 * stage.count) / data.totals.invited : 0;
    var li = el('li');
    li.appendChild(el('span', 'f-label', stage.label));
    var bar = el('span', 'f-bar');
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i');
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    li.appendChild(bar);
    li.appendChild(el('b', 'f-count', String(stage.count)));
    funnel.appendChild(li);
  });

  var waves = $('#waves');
  if (!data.byWave.length) waves.appendChild(el('li', 'muted', 'Nenhuma onda na lista.'));
  data.byWave.forEach(function (w) {
    waves.appendChild(el('li', null, 'Onda ' + w.onda + ': ' + w.invited + ' convidados · ' + w.started + ' iniciaram · ' + w.preworkDone + ' concluíram'));
  });
  var m = data.multipliers;
  $('#multipliers').textContent = m.invited
    ? 'Multiplicadores: ' + m.preworkDone + ' de ' + m.invited + ' concluíram o pre-work · ' + m.started + ' iniciaram'
    : 'Nenhum multiplicador na lista.';

  /* ---------- squads ---------- */
  var nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var shortDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
  var squadList = data.squads || [];
  var squadQuality = (data.dataQuality && data.dataQuality.squads) || { missing: [], errors: [], unread: [] };

  function review90Text(r) {
    if (r.status === 'done') return 'Revisão de 90 dias: concluída';
    var due = r.due ? shortDate.format(new Date(r.due + 'T00:00:00Z')) : '';
    if (r.status === 'overdue') return 'Revisão de 90 dias: atrasada (venceu em ' + due + ')';
    if (r.status === 'pending') return 'Revisão de 90 dias: vence em ' + due;
    return 'Revisão de 90 dias: ainda não vence';
  }

  var squads = $('#squads');
  if (!squadList.length) squads.appendChild(el('li', 'muted', 'Nenhuma squad registrada ainda.'));
  squadList.forEach(function (sq) {
    var li = el('li', 'squad');
    li.appendChild(el('b', 'squad-name', sq.squad));
    li.appendChild(el('span', 'squad-case', sq.case || 'Sem caso definido'));
    var meta = el('div', 'squad-meta');
    meta.appendChild(el('span', 'squad-gate', sq.done ? 'Todos os gates aprovados' : 'Gate atual: ' + sq.currentGate + (sq.killed ? ' (encerrado)' : '')));
    meta.appendChild(el('span', 'squad-dossier', 'Dossiê: ' + sq.dossier.percent + '%'));
    meta.appendChild(el('span', 'squad-first', '1ª tentativa: ' + sq.firstAttempt.firstTry + ' de ' + sq.firstAttempt.passed));
    meta.appendChild(el('span', 'squad-decision', 'Decisão do patrocinador: ' + (sq.decision || 'pendente')));
    meta.appendChild(el('span', 'squad-review', review90Text(sq.review90)));
    li.appendChild(meta);
    squads.appendChild(li);
  });

  var notes = [];
  if (squadQuality.unread.length) notes.push('Squads não lidas: ' + squadQuality.unread.map(function (u) { return u.squad; }).join(', ') + '.');
  if (squadQuality.errors.length) notes.push('Squads com arquivo inválido: ' + squadQuality.errors.map(function (e) { return e.squad; }).join(', ') + '.');
  if (squadQuality.missing.length) notes.push('Squads ainda sem arquivo: ' + squadQuality.missing.join(', ') + '.');
  if (notes.length) {
    $('#squads-note').textContent = notes.join(' ');
    $('#squads-note').hidden = false;
  }

  /* ---------- certificação ---------- */
  var cert = data.certification || { byLevel: { none: 0, foundation: 0, practitioner: 0, lead: 0 }, trained: 0, target: data.target, people: [] };
  var LEVEL_NAME = { none: 'Sem nível', foundation: 'Foundation', practitioner: 'Practitioner', lead: 'Lead' };
  var certCounts = $('#cert-counts');
  certCounts.appendChild(el('p', null,
    'Foundation ' + cert.byLevel.foundation + ' · Practitioner ' + cert.byLevel.practitioner + ' · Lead ' + cert.byLevel.lead + ' · Sem nível ' + cert.byLevel.none));
  certCounts.appendChild(el('p', 'muted', cert.trained + ' de ' + cert.target + ' pessoas certificadas (Foundation ou acima).'));
  var people = $('#cert-people tbody');
  cert.people.forEach(function (p) {
    var tr = el('tr');
    tr.appendChild(el('td', null, p.github));
    tr.appendChild(el('td', null, p.squad));
    tr.appendChild(el('td', null, p.finalScore === null ? '—' : nf2.format(p.finalScore)));
    tr.appendChild(el('td', null, LEVEL_NAME[p.level] || p.level));
    people.appendChild(tr);
  });
  if (!cert.people.length) {
    var empty = el('tr');
    var cell = el('td', 'muted', 'Ninguém avaliado ainda.');
    cell.colSpan = 4;
    empty.appendChild(cell);
    people.appendChild(empty);
  }

  /* ---------- scorecard ---------- */
  var STATUS_TEXT = { met: 'Meta atingida', not_met: 'Abaixo da meta', tracked: 'Acompanhando', not_measured: 'Não medido' };
  function scoreValue(i) {
    if (i.value === null || i.value === undefined) return '—';
    if (i.unit === '%') return fmt1(i.value) + '%';
    if (i.unit === 'BRL') return brl.format(i.value);
    return fmt1(i.value);
  }
  var scorecard = $('#scorecard');
  (data.scorecard || []).forEach(function (i) {
    var li = el('li', 'sc sc-' + i.status);
    li.appendChild(el('span', 'sc-label', i.label));
    li.appendChild(el('b', 'sc-value', scoreValue(i)));
    li.appendChild(el('span', 'sc-target', 'Meta: ' + i.target));
    li.appendChild(el('span', 'sc-status', STATUS_TEXT[i.status] || i.status));
    scorecard.appendChild(li);
  });

  /* ---------- satisfação ---------- */
  var sat = data.satisfaction;
  $('#nps').textContent = sat.nps === null ? '—' : (sat.nps > 0 ? '+' : '') + sat.nps;
  $('#nps-detail').textContent = sat.respondents
    ? 'Promotores ' + sat.promoters + ' · Neutros ' + sat.passives + ' · Detratores ' + sat.detractors + ' (' + sat.respondents + ' respondentes)'
    : 'Ninguém respondeu a pesquisa ainda.';

  var ratings = $('#ratings');
  RATING_LABELS.forEach(function (r) {
    var value = sat.ratings[r[0]];
    var li = el('li');
    li.appendChild(el('span', 'rating-label', r[1]));
    var bar = el('span', 'f-bar');
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i');
    fill.style.width = (value === null || value === undefined ? 0 : (100 * value) / 5) + '%';
    bar.appendChild(fill);
    li.appendChild(bar);
    li.appendChild(el('b', 'rating-value', fmt1(value)));
    ratings.appendChild(li);
  });

  $('#hours').textContent =
    (sat.hoursPerWeek.average === null ? '—' : fmt1(sat.hoursPerWeek.average) + ' h por semana') +
    ' (protegidas: ' + sat.hoursPerWeek.protected + ' h)';

  /* ---------- feedbacks ---------- */
  var current = 'all';
  var filters = $('#filters');
  var list = $('#feedback');

  function renderFeedback() {
    clear(list);
    var shown = data.feedback.filter(function (f) { return current === 'all' || f.themes.indexOf(current) !== -1; });
    if (!shown.length) {
      list.appendChild(el('li', 'empty', data.feedback.length ? 'Nenhum feedback neste tema.' : 'Nenhum feedback com texto ainda.'));
      return;
    }
    shown.forEach(function (f) {
      var li = el('li');
      li.appendChild(el('p', 'fb-text', f.text));
      var meta = el('div', 'fb-meta');
      meta.appendChild(el('span', 'fb-topic', TOPIC_LABELS[f.topic] || f.topic));
      meta.appendChild(el('span', 'fb-author', f.author || 'Sem nome'));
      meta.appendChild(el('span', 'badge', f.quotable ? 'Pode citar' : 'Não citar'));
      meta.appendChild(el('span', 'fb-themes', f.themes.map(function (t) { return themeName[t] || t; }).join(', ')));
      li.appendChild(meta);
      list.appendChild(li);
    });
  }

  THEME_LABELS.forEach(function (t) {
    var button = el('button', null, t[1]);
    button.type = 'button';
    button.dataset.theme = t[0];
    button.setAttribute('aria-pressed', t[0] === current ? 'true' : 'false');
    button.addEventListener('click', function () {
      current = t[0];
      Array.prototype.forEach.call(filters.children, function (b) {
        b.setAttribute('aria-pressed', b.dataset.theme === current ? 'true' : 'false');
      });
      renderFeedback();
    });
    filters.appendChild(button);
  });
  renderFeedback();

  /* ---------- qualidade dos dados ---------- */
  var quality = $('#quality');
  var q = data.dataQuality;
  var unread = q.unread || [];
  if (!q.missingFiles.length && !q.errors.length && !unread.length) {
    quality.appendChild(el('p', null, 'Nenhum problema nos arquivos de progresso.'));
  }
  if (unread.length) {
    quality.appendChild(el('p', null, 'Não foi possível ler:'));
    var unreadList = el('ul');
    unread.forEach(function (u) { unreadList.appendChild(el('li', null, u.github + ': ' + u.message)); });
    quality.appendChild(unreadList);
  }
  if (q.missingFiles.length) {
    quality.appendChild(el('p', null, 'Ainda sem arquivo de progresso:'));
    var missing = el('ul');
    q.missingFiles.forEach(function (h) { missing.appendChild(el('li', null, h)); });
    quality.appendChild(missing);
  }
  if (q.errors.length) {
    quality.appendChild(el('p', null, 'Arquivos com erro:'));
    var errs = el('ul');
    q.errors.forEach(function (e) { errs.appendChild(el('li', null, e.github + ': ' + e.message)); });
    quality.appendChild(errs);
  }
})();
