/* R2S Lab — o tema claro/escuro de TODAS as páginas (landing, Academy, pre-work, pesquisa, certificado e painel).
 * Uma regra só, a mesma do CSS:
 *   - sem escolha gravada, vale o sistema: escuro só se o sistema pedir escuro;
 *   - o botão sempre troca o tema que está NA TELA e grava a escolha ("r2s-academy-theme");
 *   - a escolha vale em todas as páginas, em outras abas e ao voltar pelo histórico.
 * O painel da coordenação leva uma cópia idêntica deste arquivo (admin/dashboard/tema.js; um teste confere). */
(function () {
  'use strict';
  var CHAVE = 'r2s-academy-theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function salvo() {
    try { var t = localStorage.getItem(CHAVE); return t === 'light' || t === 'dark' ? t : null; } catch (e) { return null; }
  }
  function sistema() { return mq && mq.matches ? 'dark' : 'light'; }
  function atual() {
    var t = root.dataset.theme;
    return t === 'light' || t === 'dark' ? t : sistema();
  }
  function botoes() { return document.querySelectorAll('#tema-toggle, [data-tema-toggle]'); }
  function marcar() {
    var t = atual();
    var dica = t === 'dark' ? 'Tema escuro ativo. Clique para o claro.' : 'Tema claro ativo. Clique para o escuro.';
    Array.prototype.forEach.call(botoes(), function (b) {
      b.setAttribute('data-atual', t);
      b.setAttribute('title', dica);
    });
  }
  function aplicar(t) {
    if (t === 'light' || t === 'dark') root.dataset.theme = t;
    else delete root.dataset.theme;
    marcar();
  }
  function trocar() {
    var proximo = atual() === 'dark' ? 'light' : 'dark';
    aplicar(proximo);
    try { localStorage.setItem(CHAVE, proximo); } catch (e) { /* segue sem lembrar */ }
    return proximo;
  }

  aplicar(salvo());
  document.addEventListener('click', function (ev) {
    var alvo = ev.target && ev.target.closest ? ev.target.closest('#tema-toggle, [data-tema-toggle]') : null;
    if (alvo) trocar();
  });
  /* outra aba trocou o tema */
  window.addEventListener('storage', function (ev) { if (ev.key === CHAVE) aplicar(salvo()); });
  /* voltar pelo histórico restaura a página antiga: relê a escolha */
  window.addEventListener('pageshow', function () { aplicar(salvo()); });
  /* sem escolha gravada, a página acompanha o sistema */
  if (mq) {
    var mudou = function () { marcar(); };
    if (mq.addEventListener) mq.addEventListener('change', mudou); else if (mq.addListener) mq.addListener(mudou);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', marcar); else marcar();

  window.R2STema = { atual: atual, trocar: trocar, aplicar: aplicar };
})();
