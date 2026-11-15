/* R2S Lab — estado do participante no navegador.
 * UMD: no Node exporta `createStore(storage)`; no navegador cria `window.R2SStore`
 * sobre o `localStorage` (ou só em memória, se ele estiver bloqueado). */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory(isNode ? require('./progress.js') : root.R2SProgress);
  if (isNode) module.exports = api;
  else {
    root.R2SStore = api.createStore(api.browserStorage(root));
    root.R2SDrafts = function (key) { return api.createDrafts(api.browserStorage(root), key); };
  }
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';

  var KEY = 'r2s-progress-v1';

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  /** `localStorage` do navegador, ou `null` se o acesso lançar erro. */
  function browserStorage(root) {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  /** Completa o que faltar em um estado salvo, sem validar o contrato. */
  function normalize(obj) {
    var base = P.emptyProgress('');
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return base;
    var out = Object.assign(base, obj);
    if (!out.prework || typeof out.prework !== 'object') out.prework = { blocks: {}, quizzes: {} };
    if (!out.prework.blocks || typeof out.prework.blocks !== 'object') out.prework.blocks = {};
    if (!out.prework.quizzes || typeof out.prework.quizzes !== 'object') out.prework.quizzes = {};
    if (out.selfAssessment === undefined) out.selfAssessment = null;
    if (out.survey === undefined) out.survey = null;
    return out;
  }

  function createStore(storage) {
    var memory = null;

    function load() {
      var raw = null;
      if (storage) {
        try { raw = storage.getItem(KEY); } catch (e) { raw = null; }
      }
      if (raw) {
        try { return normalize(JSON.parse(raw)); } catch (e) { /* cai para a memória */ }
      }
      return memory ? normalize(clone(memory)) : P.emptyProgress('');
    }

    /** Devolve `false` se não deu para gravar no `localStorage` (o estado segue na memória). */
    function save(p) {
      memory = clone(p);
      if (!storage) return false;
      try { storage.setItem(KEY, JSON.stringify(p)); return true; } catch (e) { return false; }
    }

    function clear() {
      memory = null;
      if (storage) { try { storage.removeItem(KEY); } catch (e) { /* ignora */ } }
    }

    return { load: load, save: save, clear: clear };
  }

  /** Rascunhos locais (respostas dos quizzes, campos dos exercícios): nunca entram no arquivo exportado. */
  function createDrafts(storage, key) {
    var memory = {};
    return {
      load: function () {
        if (storage) {
          try {
            var raw = storage.getItem(key);
            if (raw) {
              var parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
            }
          } catch (e) { /* cai para a memória */ }
        }
        return clone(memory);
      },
      save: function (obj) {
        memory = clone(obj);
        if (!storage) return false;
        try { storage.setItem(key, JSON.stringify(obj)); return true; } catch (e) { return false; }
      },
      clear: function () {
        memory = {};
        if (storage) { try { storage.removeItem(key); } catch (e) { /* ignora */ } }
      },
    };
  }

  return {
    KEY: KEY, createStore: createStore, createDrafts: createDrafts,
    browserStorage: browserStorage, normalize: normalize,
  };
});
