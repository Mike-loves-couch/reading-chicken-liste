import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etichettaTipo, formattaData, formattaQuantita, formattaSecondi } from '../js/formato.js';

test('formattaSecondi usa un decimale con la virgola, "-" se il tempo manca', () => {
  assert.equal(formattaSecondi(3.2), '3,2 s');
  assert.equal(formattaSecondi(12), '12,0 s');
  assert.equal(formattaSecondi(null), '-');
  assert.equal(formattaSecondi(undefined), '-');
});

test('formattaData usa giorno/mese/anno, ore:minuti', () => {
  assert.match(formattaData('2026-10-26T12:40:00.000Z'), /^\d{2}\/\d{2}\/2026, \d{2}:\d{2}$/);
});

test('formattaQuantita usa singolare e plurale', () => {
  assert.equal(formattaQuantita(1, 'parole'), '1 parola');
  assert.equal(formattaQuantita(10, 'parole'), '10 parole');
  assert.equal(formattaQuantita(1, 'sillabe'), '1 sillaba');
  assert.equal(formattaQuantita(5, 'sillabe'), '5 sillabe');
});

test('etichettaTipo usa le etichette del menu', () => {
  assert.equal(etichettaTipo('sillabe'), 'Sillabe');
  assert.equal(etichettaTipo('parole'), 'Parole');
});
