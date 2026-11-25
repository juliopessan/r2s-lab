import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import browser from './helpers/browser.cjs';

/* Tema claro/escuro: uma regra só em todas as páginas do lab (js/tema.js + css/theme.css). */
const { withPage } = browser;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGINAS = ['site/index.html', 'academy/index.html', 'academy/curso.html?c=p1', '00-prework/index.html',
  '05-encerramento/pesquisa.html', '05-encerramento/certificado.html', 'admin/dashboard/index.html'];
const fundo = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
/* posição do círculo do interruptor: 0 = sol (claro), 30 = lua (escuro) */
const circulo = (page) => page.evaluate(() => {
  const t = getComputedStyle(document.querySelector('#tema-toggle'), '::before').transform;
  return t === 'none' ? 0 : Math.round(new DOMMatrix(t).m41);
});

test('every page carries the same switch and the same rule', async () => {
  await withPage({}, async (page, url) => {
    for (const p of PAGINAS) {
      await page.goto(url + p, { waitUntil: 'load' });
      assert.equal(await page.locator('#tema-toggle.tema-btn .sol').count(), 1, p);
      assert.equal(await page.locator('#tema-toggle.tema-btn .lua').count(), 1, p);
      assert.equal(await page.locator('script[src$="tema.js"]').count(), 1, p);
    }
  });
});

test('the dashboard copy of the theme script is identical to the platform one', () => {
  assert.equal(readFileSync(path.join(root, 'admin/dashboard/tema.js'), 'utf8'), readFileSync(path.join(root, 'js/tema.js'), 'utf8'));
});

for (const scheme of ['light', 'dark', 'no-preference']) {
  test(`the first click always flips what is on screen (system: ${scheme})`, async () => {
    await withPage({}, async (page, url) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      for (const p of PAGINAS) {
        await page.goto(url + p, { waitUntil: 'load' });
        await page.evaluate(() => localStorage.removeItem('r2s-academy-theme'));
        await page.reload({ waitUntil: 'load' });
        const antes = await fundo(page);
        const escuroAntes = antes === 'rgb(0, 0, 0)';
        assert.equal(escuroAntes, scheme === 'dark', `${p}: no choice follows the system`);
        assert.equal(await circulo(page), escuroAntes ? 30 : 0, `${p}: the switch shows the theme on screen`);
        await page.click('#tema-toggle');
        const depois = await fundo(page);
        assert.notEqual(depois, antes, `${p}: one click changes the screen`);
        assert.equal(await circulo(page), escuroAntes ? 0 : 30, `${p}: the switch follows`);
        assert.equal(await page.evaluate(() => localStorage.getItem('r2s-academy-theme')), escuroAntes ? 'light' : 'dark');
      }
    });
  });
}

test('a choice made in the Academy holds on every other page, including the pre-work and the dashboard', async () => {
  for (const escolha of ['light', 'dark']) {
    await withPage({}, async (page, url) => {
      await page.emulateMedia({ colorScheme: escolha === 'light' ? 'dark' : 'light', reducedMotion: 'reduce' });
      await page.goto(url + 'academy/index.html', { waitUntil: 'load' });
      await page.click('#tema-toggle');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), escolha);
      const esperado = escolha === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
      for (const p of PAGINAS) {
        await page.goto(url + p, { waitUntil: 'load' });
        assert.equal(await fundo(page), esperado, `${p} in ${escolha}`);
      }
    });
  }
});

test('the footer button and the header switch flip the same theme', async () => {
  await withPage({}, async (page, url) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto(url + 'academy/index.html', { waitUntil: 'load' });
    await page.click('#tema-toggle-rodape');
    assert.equal(await fundo(page), 'rgb(0, 0, 0)');
    await page.click('#tema-toggle');
    assert.equal(await fundo(page), 'rgb(255, 255, 255)');
  });
});

test('going back in history shows the latest choice, not the old page state', async () => {
  await withPage({}, async (page, url) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto(url + 'academy/index.html', { waitUntil: 'load' });
    await page.goto(url + '00-prework/index.html', { waitUntil: 'load' });
    await page.click('#tema-toggle');
    assert.equal(await fundo(page), 'rgb(0, 0, 0)');
    await page.goBack({ waitUntil: 'load' });
    assert.equal(await fundo(page), 'rgb(0, 0, 0)');
  });
});

test('the switch says which theme is on, for mouse users too', async () => {
  await withPage({}, async (page, url) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(url + 'academy/index.html', { waitUntil: 'load' });
    assert.equal(await page.getAttribute('#tema-toggle', 'data-atual'), 'light');
    assert.match(await page.getAttribute('#tema-toggle', 'title'), /claro ativo/);
    await page.click('#tema-toggle');
    assert.equal(await page.getAttribute('#tema-toggle', 'data-atual'), 'dark');
    assert.match(await page.getAttribute('#tema-toggle', 'title'), /escuro ativo/);
  });
});
