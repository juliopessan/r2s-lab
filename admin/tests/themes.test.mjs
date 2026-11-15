import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, themesFor } from '../src/themes.mjs';

test('the theme list is fixed and ends with outros', () => {
  assert.deepEqual(THEMES, ['carga', 'mentoria', 'conteudo', 'sponsor', 'ferramentas', 'demo', 'outros']);
});

test('matches without accents or case', () => {
  assert.deepEqual(themesFor('A MENTORIA com o Coach'), ['mentoria']);
  assert.deepEqual(themesFor('Os EXERCÍCIOS foram ótimos'), ['conteudo']);
});

test('finds several themes in the order of THEMES', () => {
  assert.deepEqual(themesFor('Mais tempo para os exercícios'), ['carga', 'conteudo']);
});

test('falls back to outros', () => {
  assert.deepEqual(themesFor('Gostei muito'), ['outros']);
});

test('empty text has no theme', () => {
  assert.deepEqual(themesFor(''), []);
  assert.deepEqual(themesFor('   '), []);
  assert.deepEqual(themesFor(undefined), []);
});

test('each stem family is recognised', () => {
  assert.deepEqual(themesFor('o ritmo cansou'), ['carga']);
  assert.deepEqual(themesFor('faltou apoio do patrocinador'), ['sponsor']);
  assert.deepEqual(themesFor('o ambiente do sandbox caiu'), ['ferramentas']);
  assert.deepEqual(themesFor('o pitch e o painel ajudaram'), ['demo']);
});

test('the fixture texts map as expected', () => {
  assert.deepEqual(themesFor('A mentoria com o coach foi o melhor momento.'), ['mentoria']);
  assert.deepEqual(themesFor('Mais tempo protegido para a squad.'), ['carga']);
  assert.deepEqual(themesFor('Usei a regra do mais barato numa proposta.'), ['conteudo']);
  assert.deepEqual(themesFor('Os exercícios com casos reais.'), ['conteudo']);
  assert.deepEqual(themesFor('A carga semanal passou de 6 horas.'), ['carga']);
});
