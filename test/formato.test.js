import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etichettaTipo, formattaData, formattaDurata, formattaQuantita } from '../js/formato.js';

test('formattaDurata', () => {
  assert.equal(formattaDurata(0), '0 s');
  assert.equal(formattaDurata(45), '45 s');
  assert.equal(formattaDurata(60), '1 min 0 s');
  assert.equal(formattaDurata(312), '5 min 12 s');
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
