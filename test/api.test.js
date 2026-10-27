import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErroreApi, chiama } from '../js/api.js';

// fetch finto: registra le chiamate e risponde con lo stato e il corpo dati
function fetchFinto(stato, corpo) {
  const chiamate = [];
  const finto = async (url, opzioni) => {
    chiamate.push({ url, ...opzioni });
    return {
      status: stato,
      ok: stato >= 200 && stato < 300,
      json: async () => {
        if (corpo === undefined) throw new SyntaxError('nessun JSON');
        return corpo;
      },
    };
  };
  return { finto, chiamate };
}

test('una GET chiede JSON a /api e restituisce i dati', async () => {
  const { finto, chiamate } = fetchFinto(200, { utente: { email: 'a@esempio.it' } });
  assert.deepEqual(await chiama('GET', '/io', undefined, finto), { utente: { email: 'a@esempio.it' } });
  assert.equal(chiamate[0].url, '/api/io');
  assert.equal(chiamate[0].method, 'GET');
  assert.equal(chiamate[0].credentials, 'same-origin');
  assert.equal(chiamate[0].body, undefined);
});

test('le altre richieste mandano il corpo in JSON e 204 restituisce null', async () => {
  const { finto, chiamate } = fetchFinto(204);
  assert.equal(await chiama('POST', '/accesso/richiesta', { email: 'a@esempio.it' }, finto), null);
  assert.equal(chiamate[0].headers['Content-Type'], 'application/json');
  assert.equal(chiamate[0].body, '{"email":"a@esempio.it"}');
});

test('senza corpo si manda un oggetto vuoto', async () => {
  const { finto, chiamate } = fetchFinto(204);
  await chiama('POST', '/esci', undefined, finto);
  assert.equal(chiamate[0].body, '{}');
});

test('un errore del server diventa un ErroreApi con il suo messaggio', async () => {
  const { finto } = fetchFinto(429, { errore: "Troppe richieste: riprova tra un'ora" });
  await assert.rejects(chiama('POST', '/accesso/richiesta', {}, finto), (errore) =>
    errore instanceof ErroreApi && errore.stato === 429 && errore.message === "Troppe richieste: riprova tra un'ora");
});

test('una risposta di errore senza JSON ha un messaggio generico', async () => {
  const { finto } = fetchFinto(404);
  await assert.rejects(chiama('GET', '/io', undefined, finto), (errore) =>
    errore.stato === 404 && errore.message === 'Il server non risponde: riprova più tardi');
});

test('senza rete arriva un ErroreApi con stato 0', async () => {
  const guasto = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(chiama('GET', '/io', undefined, guasto), (errore) =>
    errore instanceof ErroreApi && errore.stato === 0 && errore.message === 'Connessione non riuscita: controlla internet e riprova');
});
