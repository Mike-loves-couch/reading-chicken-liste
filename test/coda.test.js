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

test('una partita che il server rifiuta di sicuro viene scartata e si passa alla successiva', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const rifiuti = [
    [400, 'Dati non validi'],
    [409, 'Partita già registrata'],
    [404, 'Profilo non trovato'],
  ];
  for (const [stato, messaggio] of rifiuti) {
    const inviate = [];
    const coda = creaCoda(storageFinto(), async (p) => {
      inviate.push(p.id_client);
      if (p.id_client === 'a') throw new ErroreApi(stato, messaggio);
    });
    coda.aggiungi(partita('a'));
    coda.aggiungi(partita('b'));
    assert.equal(await coda.inviaTutto(), 0, String(stato));
    assert.deepEqual(inviate, ['a', 'b'], String(stato));
  }
});

test('404 o 403 che possono venire dall\'hosting fermano la coda e tengono le partite', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const dubbi = [
    [404, 'Il server non risponde: riprova più tardi'],
    [403, 'Accesso negato'],
  ];
  for (const [stato, messaggio] of dubbi) {
    const inviate = [];
    const coda = creaCoda(storageFinto(), async (p) => {
      inviate.push(p.id_client);
      throw new ErroreApi(stato, messaggio);
    });
    coda.aggiungi(partita('a'));
    coda.aggiungi(partita('b'));
    assert.equal(await coda.inviaTutto(), 2, String(stato));
    assert.deepEqual(inviate, ['a'], String(stato));
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
  let scritture = 0;
  const pieno = () => { scritture += 1; throw new Error('QuotaExceededError'); };
  const storage = [
    { getItem: errore, setItem: errore },
    { getItem: () => null, setItem: pieno },
  ];
  for (const deposito of storage) {
    scritture = 0;
    const inviate = [];
    const coda = creaCoda(deposito, async (p) => { inviate.push(p.id_client); });
    coda.aggiungi(partita('a'));
    const dopoLaPrima = scritture;
    coda.aggiungi(partita('b'));
    assert.equal(coda.inAttesa(), 2);
    assert.equal(await coda.inviaTutto(), 0);
    assert.deepEqual(inviate, ['a', 'b']);
    assert.equal(scritture, dopoLaPrima, 'dopo il primo errore lo storage non si scrive più');
  }
});
