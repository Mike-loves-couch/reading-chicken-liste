// Chiamate alle API del server, sullo stesso dominio delle pagine.
// Gli errori arrivano come { errore: "messaggio" } e diventano ErroreApi.
export class ErroreApi extends Error {
  constructor(stato, messaggio) {
    super(messaggio);
    this.stato = stato;
  }
}

export async function chiama(metodo, percorso, corpo, richiesta = globalThis.fetch) {
  const opzioni = { method: metodo, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (metodo !== 'GET') {
    opzioni.headers['Content-Type'] = 'application/json';
    opzioni.body = JSON.stringify(corpo ?? {});
  }
  let risposta;
  try {
    risposta = await richiesta(`/api${percorso}`, opzioni);
  } catch {
    throw new ErroreApi(0, 'Connessione non riuscita: controlla internet e riprova');
  }
  if (risposta.status === 204) return null;
  const dati = await risposta.json().catch(() => null);
  if (!risposta.ok) throw new ErroreApi(risposta.status, dati?.errore ?? 'Il server non risponde: riprova più tardi');
  return dati;
}
