import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaAbilita, chiaveGruppo, coloreVelocita, indicePerParola, mediana, quotaParole } from '../js/abilita.js';
import { normalizzaListe } from '../js/liste.js';

const liste = normalizzaListe({
  Bisillabe: { Facili: ['casa', 'sole', 'mare'], Gruppi: ['pasta', 'corsa'] },
  Trisillabe: { Facili: ['banana'] },
});

const partita = (data, tipo, parole) => ({ data, tipo, parole });
const lettura = (testo, secondi, riprova = 0) => ({ testo, secondi, riprova });

test('mediana: dispari, pari, vuota', () => {
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 2, 3]), 2.5);
  assert.equal(mediana([]), null);
});

test('indicePerParola: da ogni parola le liste che la contengono', () => {
  const indice = indicePerParola(liste);
  assert.deepEqual(indice.get('casa'), ['Bisillabe - Facili']);
  assert.equal(indice.get('xyz'), undefined);
});

test('calcolaAbilita: parole diverse e velocità per lista e per gruppo, dal testo delle parole', () => {
  const partite = [
    partita('2026-01-01T10:00:00Z', 'parole', [lettura('casa', 4), lettura('pasta', 2), lettura('Banana', 6)]),
    partita('2026-01-02T10:00:00Z', 'parole', [lettura('CASA', 2), lettura('sole', 3), lettura('nonc\'e', 9)]),
    partita('2026-01-03T10:00:00Z', 'sillabe', [lettura('casa', 1)]), // altro tipo: non conta
  ];
  const abilita = calcolaAbilita(partite, liste, 'parole');
  assert.deepEqual(abilita.get('Bisillabe - Facili'), { paroleDiverse: 2, mediana: 3, bersaglio: 3 });
  assert.deepEqual(abilita.get('Bisillabe - Gruppi'), { paroleDiverse: 1, mediana: 2, bersaglio: 2 });
  assert.deepEqual(abilita.get(chiaveGruppo('Bisillabe')), { paroleDiverse: 3, mediana: 2.5, bersaglio: 5 });
  assert.deepEqual(abilita.get('Trisillabe - Facili'), { paroleDiverse: 1, mediana: 6, bersaglio: 1 });
});

test('calcolaAbilita: la velocità conta solo le ultime letture e ignora i tempi mancanti', () => {
  const partite = [
    partita('2026-01-01T10:00:00Z', 'parole', [lettura('casa', 20), lettura('sole', 20)]),
    partita('2026-01-02T10:00:00Z', 'parole', [lettura('casa', 2), lettura('sole', null), lettura('mare', 4)]),
  ];
  assert.equal(calcolaAbilita(partite, liste, 'parole', { ultime: 2 }).get('Bisillabe - Facili').mediana, 3);
  assert.equal(calcolaAbilita([], liste, 'parole').get('Bisillabe - Facili').mediana, null);
  assert.equal(calcolaAbilita([], liste, 'parole').get('Bisillabe - Facili').paroleDiverse, 0);
});

test('quotaParole: da 0 a 1, piena al bersaglio', () => {
  assert.equal(quotaParole({ paroleDiverse: 0, bersaglio: 100 }), 0);
  assert.equal(quotaParole({ paroleDiverse: 25, bersaglio: 100 }), 0.25);
  assert.equal(quotaParole({ paroleDiverse: 300, bersaglio: 100 }), 1);
  assert.equal(quotaParole({ paroleDiverse: 3, bersaglio: 0 }), 0);
});

test('coloreVelocita: dal verde-azzurro (veloce) all\'arancione (lento), senza tempo nessun colore', () => {
  assert.equal(coloreVelocita(null, 'Bisillabe'), null);
  assert.match(coloreVelocita(1, 'Bisillabe'), /^hsl\(175 /);
  assert.match(coloreVelocita(60, 'Bisillabe'), /^hsl\(35 /);
  // a parità di secondi una parola più lunga è "più veloce"
  const tonoBi = Number(coloreVelocita(5, 'Bisillabe').match(/hsl\((\d+)/)[1]);
  const tonoPenta = Number(coloreVelocita(5, 'Pentasillabe').match(/hsl\((\d+)/)[1]);
  assert.ok(tonoPenta > tonoBi);
});
