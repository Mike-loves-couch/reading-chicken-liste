import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collegaTastiera, INTERVALLO_MS } from '../js/input.js';

function tasto(tipo, key) {
  return Object.assign(new Event(tipo, { cancelable: true }), { key });
}

function prepara(t) {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const bersaglio = new EventTarget();
  const passi = [];
  const scollega = collegaTastiera(bersaglio, (direzione) => passi.push(direzione));
  return { bersaglio, passi, scollega };
}

test('una pressione produce un passo e blocca lo scorrimento della pagina', (t) => {
  const { bersaglio, passi } = prepara(t);
  const pressione = tasto('keydown', 'ArrowDown');
  bersaglio.dispatchEvent(pressione);
  bersaglio.dispatchEvent(tasto('keyup', 'ArrowDown'));
  t.mock.timers.tick(INTERVALLO_MS * 3);
  assert.deepEqual(passi, ['giu']);
  assert.equal(pressione.defaultPrevented, true);
});

test('tenendo premuto si fa un passo ogni intervallo, ignorando la ripetizione del sistema', (t) => {
  const { bersaglio, passi } = prepara(t);
  bersaglio.dispatchEvent(tasto('keydown', 'ArrowRight'));
  t.mock.timers.tick(INTERVALLO_MS * 3);
  bersaglio.dispatchEvent(tasto('keydown', 'ArrowRight'));
  bersaglio.dispatchEvent(tasto('keyup', 'ArrowRight'));
  t.mock.timers.tick(INTERVALLO_MS * 3);
  assert.deepEqual(passi, ['destra', 'destra', 'destra', 'destra']);
});

test("premere un'altra freccia cambia direzione", (t) => {
  const { bersaglio, passi } = prepara(t);
  bersaglio.dispatchEvent(tasto('keydown', 'ArrowUp'));
  bersaglio.dispatchEvent(tasto('keydown', 'ArrowLeft'));
  t.mock.timers.tick(INTERVALLO_MS);
  bersaglio.dispatchEvent(tasto('keyup', 'ArrowUp')); // non ferma la sinistra
  t.mock.timers.tick(INTERVALLO_MS);
  assert.deepEqual(passi, ['su', 'sinistra', 'sinistra', 'sinistra']);
});

test('gli altri tasti non vengono toccati', (t) => {
  const { bersaglio, passi } = prepara(t);
  const invio = tasto('keydown', 'Enter');
  bersaglio.dispatchEvent(invio);
  assert.deepEqual(passi, []);
  assert.equal(invio.defaultPrevented, false);
});

test('perdere il focus ferma il movimento', (t) => {
  const { bersaglio, passi } = prepara(t);
  bersaglio.dispatchEvent(tasto('keydown', 'ArrowDown'));
  bersaglio.dispatchEvent(new Event('blur'));
  t.mock.timers.tick(INTERVALLO_MS * 3);
  assert.deepEqual(passi, ['giu']);
});

test('scollega ferma tutto e smette di ascoltare', (t) => {
  const { bersaglio, passi, scollega } = prepara(t);
  bersaglio.dispatchEvent(tasto('keydown', 'ArrowDown'));
  scollega();
  t.mock.timers.tick(INTERVALLO_MS * 3);
  bersaglio.dispatchEvent(tasto('keydown', 'ArrowUp'));
  assert.deepEqual(passi, ['giu']);
});
