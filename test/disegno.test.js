import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latoPiastrella } from '../js/disegno.js';

test('sotto i 32 px il lato resta quello che entra', () => {
  assert.equal(latoPiastrella(31.9), 31);
  assert.equal(latoPiastrella(21.4), 21);
});

test('mai sotto gli 8 px', () => {
  assert.equal(latoPiastrella(3), 8);
});

test('si scende al multiplo di 16 solo se si perde al massimo un ottavo', () => {
  assert.equal(latoPiastrella(34), 32); // perde 2 su 34
  assert.equal(latoPiastrella(50), 48); // perde 2 su 50
  assert.equal(latoPiastrella(43), 43); // perderebbe 11 su 43: si tiene 43
  assert.equal(latoPiastrella(64), 64);
});
