/* R2S Lab — Exportar, Importar e Limpar progresso, compartilhado pelas páginas.
 * Script clássico (sem módulos), para abrir também por file://.
 *
 * Espera na página: #gh, #export-btn, #import-input, #reset-btn, #export-msg.
 * `opts`: { store, getState(), setState(state), persist(), hydrate(), clearDrafts(), validate?() }
 * `validate()` (opcional) devolve a lista de itens que faltam; se não estiver vazia, bloqueia a exportação. */
(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }

  function readText(file) {
    if (file.text) return file.text();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function download(filename, text) {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function init(opts) {
    var gh = $('#gh');
    var message = $('#export-msg');

    gh.value = opts.getState().github || '';
    gh.addEventListener('input', function () {
      opts.getState().github = gh.value.trim();
      opts.persist();
    });

    var guardArmed = false;
    $('#export-btn').addEventListener('click', function () {
      opts.persist();
      var missing = opts.validate ? opts.validate() : [];
      if (missing.length) {
        message.textContent = 'Antes de exportar, responda: ' + missing.join(', ') + '.';
        return;
      }
      var warning = opts.guard ? opts.guard() : null;
      if (warning && !guardArmed) {
        guardArmed = true;
        message.textContent = warning + ' Se mesmo assim quiser exportar, clique em Exportar de novo.';
        setTimeout(function () { guardArmed = false; }, 10000);
        return;
      }
      var result = opts.store.buildExport(gh.value);
      if (!result.ok) {
        message.textContent = result.errors.join(' ');
        return;
      }
      guardArmed = false;
      download(result.filename, result.json);
      message.textContent = 'Arquivo gerado: ' + result.filename +
        '. Coloque-o na pasta progress/ do seu repositório privado, faça o commit e o push.';
    });

    $('#import-input').addEventListener('change', function (event) {
      var input = event.target;
      var file = input.files && input.files[0];
      if (!file) return;
      readText(file).then(function (text) {
        var result = opts.store.importProgress(text);
        if (!result.ok) {
          message.textContent = result.error;
        } else {
          opts.setState(opts.store.load());
          opts.hydrate();
          message.textContent = 'Progresso importado.';
        }
        input.value = '';
      }, function () {
        message.textContent = 'Não consegui ler o arquivo.';
      });
    });

    var armed = false;
    $('#reset-btn').addEventListener('click', function () {
      var button = $('#reset-btn');
      if (!armed) {
        armed = true;
        button.textContent = 'Confirmar: apagar tudo';
        setTimeout(function () { armed = false; button.textContent = 'Limpar meu progresso'; }, 4000);
        return;
      }
      opts.store.clearAll();
      if (opts.clearDrafts) opts.clearDrafts();
      location.reload();
    });
  }

  window.R2SExportUI = { init: init };
})();
