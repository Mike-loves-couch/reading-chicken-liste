import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formattaData, formattaDurata } from '../js/formato.js';

test('formattaDurata', () => {
  assert.equal(formattaDurata(0), '0 s');
  assert.equal(formattaDurata(45), '45 s');
  assert.equal(formattaDurata(60), '1 min 0 s');
  assert.equal(formattaDurata(312), '5 min 12 s');
});

test('formattaData usa giorno/mese/anno, ore:minuti', () => {
  assert.match(formattaData('2026-10-26T12:40:00.000Z'), /^\d{2}\/\d{2}\/2026, \d{2}:\d{2}$/);
});
