import { chiama } from './api.js';

// Chi ha fatto l'accesso, se c'è un server. 'senza-server': le API non esistono (GitHub Pages, server
// statico) o non rispondono; 'fuori': server presente, nessun accesso; 'dentro': utente e profili.
export async function leggiAccount(richiesta = chiama) {
  try {
    const { utente, bambini } = await richiesta('GET', '/io');
    return { stato: 'dentro', utente, bambini };
  } catch (errore) {
    return { stato: errore.stato === 401 ? 'fuori' : 'senza-server', utente: null, bambini: [] };
  }
}
