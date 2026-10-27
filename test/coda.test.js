import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErroreApi } from '../js/api.js';
import { CHIAVE_CODA, creaCoda } from '../js/coda.js';

function storageFinto() {
  const dati = new Map();
  return {
    getItem: (chiave) => (dati.has(chiave) ? dati.get(chiave) : null),
    setItem: (chiave, valore) => dati.set(chiave, String(valore)),
  };
}

const partita = (id) => ({ id_client: id });

test('le partite partono nell\'ordine e lasciano la coda quando il server le riceve', async () => {
  const storage = storageFinto();
  const inviate = [];
  const coda = creaCoda(storage, async (p) => { inviate.push(p.id_client); });
  coda.aggiungi(partita('a'));
  coda.aggiungi(partita('b'));
  assert.equal(coda.inAttesa(), 2);
  assert.equal(await coda.inviaTutto(), 0);
  assert.deepEqual(inviate, ['a', 'b']);
  assert.equal(storage.getItem(CHIAVE_CODA), '[]');
});

test('senza rete, con accesso scaduto o con il server in errore la coda si ferma e aspetta', async () => {
  for (const stato of [0, 401, 500]) {
    const inviate = [];
    const coda = creaCoda(storageFinto(), async (p) => {
      inviate.push(p.id_client);
      throw new ErroreApi(stato, 'no');
    });
    coda.aggiungi(partita('a'));
    coda.aggiungi(partita('b'));
    assert.equal(await coda.inviaTutto(), 2, String(stato));
    assert.deepEqual(inviate, ['a'], String(stato));
  }
});

test('una partita che il server non accetterà mai viene scartata e si passa alla successiva', async (t) => {
  t.mock.method(console, 'warn', () => {});
  for (const stato of [400, 403, 404, 409]) {
    const inviate = [];
    const coda = creaCoda(storageFinto(), async (p) => {
      inviate.push(p.id_client);
      if (p.id_client === 'a') throw new ErroreApi(stato, 'no');
    });
    coda.aggiungi(partita('a'));
    coda.aggiungi(partita('b'));
    assert.equal(await coda.inviaTutto(), 0, String(stato));
    assert.deepEqual(inviate, ['a', 'b'], String(stato));
  }
});

test('se il browser non permette di salvare la coda vive in memoria', async () => {
  const inviate = [];
  const coda = creaCoda(null, async (p) => { inviate.push(p.id_client); });
  coda.aggiungi(partita('a'));
  assert.equal(coda.inAttesa(), 1);
  assert.equal(await coda.inviaTutto(), 0);
  assert.deepEqual(inviate, ['a']);
});

test('dati rovinati nel browser valgono come coda vuota', async () => {
  const storage = storageFinto();
  storage.setItem(CHIAVE_CODA, '{rotto');
  assert.equal(creaCoda(storage, async () => {}).inAttesa(), 0);
  storage.setItem(CHIAVE_CODA, '{"a":1}');
  assert.equal(creaCoda(storage, async () => {}).inAttesa(), 0);
});

test('con lo storage bloccato o pieno la coda vive in memoria', async () => {
  const errore = () => { throw new Error('SecurityError'); };
  const storage = [
    { getItem: errore, setItem: errore },
    { getItem: () => null, setItem: errore },
  ];
  for (const deposito of storage) {
    const inviate = [];
    const coda = creaCoda(deposito, async (p) => { inviate.push(p.id_client); });
    coda.aggiungi(partita('a'));
    coda.aggiungi(partita('b'));
    assert.equal(coda.inAttesa(), 2);
    assert.equal(await coda.inviaTutto(), 0);
    assert.deepEqual(inviate, ['a', 'b']);
  }
});
