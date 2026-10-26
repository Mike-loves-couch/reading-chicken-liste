import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { TEMA_PREDEFINITO, TEMI, immaginiDeiTemi, temaDa } from '../js/temi.js';

const radice = new URL('../', import.meta.url);

// larghezza e altezza di un PNG, lette dall'intestazione IHDR
function misurePng(percorso) {
  const dati = readFileSync(new URL(percorso, radice));
  return { larghezza: dati.readUInt32BE(16), altezza: dati.readUInt32BE(20) };
}

function indiciUsati(tema) {
  const { piastrelle, guardiani, uscita } = tema;
  const strati = [piastrelle.muroCima, piastrelle.muroFronte, piastrelle.pavimento, piastrelle.pavimentoOmbra];
  return [...strati.flat(2), ...guardiani, ...(uscita.chiusa === null ? [] : [uscita.chiusa])];
}

test('ci sono i tre mondi e quello predefinito esiste', () => {
  assert.deepEqual(Object.keys(TEMI), ['fattoria', 'dungeon', 'spazio']);
  assert.ok(TEMI[TEMA_PREDEFINITO]);
  for (const [nome, tema] of Object.entries(TEMI)) assert.equal(tema.nome, nome);
});

test('un nome sconosciuto ripiega sul mondo predefinito', () => {
  assert.equal(temaDa('spazio'), TEMI.spazio);
  assert.equal(temaDa('luna'), TEMI[TEMA_PREDEFINITO]);
  assert.equal(temaDa(null), TEMI[TEMA_PREDEFINITO]);
  for (const nome of ['constructor', 'toString', '__proto__']) assert.equal(temaDa(nome), TEMI[TEMA_PREDEFINITO], nome);
});

test('tutte le immagini dei mondi esistono', () => {
  for (const percorso of immaginiDeiTemi()) assert.ok(existsSync(new URL(percorso, radice)), percorso);
});

test('ogni indice usato sta dentro il foglio del suo mondo', () => {
  for (const tema of Object.values(TEMI)) {
    const { larghezza, altezza } = misurePng(tema.foglio);
    assert.equal(larghezza, 192, `${tema.nome}: il foglio deve avere 12 colonne da 16 px`);
    const totale = (larghezza / 16) * Math.floor(altezza / 16);
    for (const indice of indiciUsati(tema)) {
      assert.ok(Number.isInteger(indice) && indice >= 0 && indice < totale, `${tema.nome}: indice ${indice}`);
    }
  }
});

test('ogni mondo ha almeno un oggetto, le icone e i colori', () => {
  for (const tema of Object.values(TEMI)) {
    assert.ok(tema.oggetti.length > 0, tema.nome);
    assert.ok(tema.icone.mascotte && tema.icone.contatore, tema.nome);
    assert.match(tema.sfondo, /^#[0-9a-f]{6}$/i, tema.nome);
    assert.ok(tema.coriandoli.length > 0, tema.nome);
    for (const voce of ['muroCima', 'muroFronte', 'pavimento', 'pavimentoOmbra']) {
      assert.ok(tema.piastrelle[voce].length > 0 && tema.piastrelle[voce].every((s) => s.length > 0), `${tema.nome} ${voce}`);
    }
  }
});
