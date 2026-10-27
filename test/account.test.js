import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leggiAccount } from '../js/account.js';
import { ErroreApi } from '../js/api.js';

test("con l'accesso restituisce utente e profili", async () => {
  const richiesta = async (metodo, percorso) => {
    assert.deepEqual([metodo, percorso], ['GET', '/io']);
    return { utente: { email: 'rossi@esempio.it' }, bambini: [{ id: 1, nome: 'Pulcino' }] };
  };
  assert.deepEqual(await leggiAccount(richiesta), {
    stato: 'dentro', utente: { email: 'rossi@esempio.it' }, bambini: [{ id: 1, nome: 'Pulcino' }],
  });
});

test('con il server ma senza accesso lo stato è "fuori"', async () => {
  const richiesta = async () => { throw new ErroreApi(401, "Serve l'accesso"); };
  assert.deepEqual(await leggiAccount(richiesta), { stato: 'fuori', utente: null, bambini: [] });
});

test('senza server (GitHub Pages, server statico, rete assente) lo stato è "senza-server"', async () => {
  for (const stato of [404, 0, 500]) {
    const richiesta = async () => { throw new ErroreApi(stato, 'no'); };
    assert.equal((await leggiAccount(richiesta)).stato, 'senza-server', String(stato));
  }
});
