import { chiama } from '../js/api.js';
import { collegaRichiestaLink } from '../js/richiesta-link.js';

const token = new URLSearchParams(window.location.search).get('token');
// il token non resta nella barra degli indirizzi né nella cronologia
if (token) window.history.replaceState(null, '', window.location.pathname);

const entra = document.getElementById('entra');
const chiediLink = document.getElementById('chiedi-link');
const pulsanteEntra = document.getElementById('pulsante-entra');
collegaRichiestaLink(document.getElementById('modulo-link'), document.getElementById('messaggio-link'));

// Si entra solo premendo il pulsante: alcuni filtri antispam aprono da soli i link delle email
// e, se il token si consumasse all'apertura, il link arriverebbe già usato.
pulsanteEntra.addEventListener('click', async () => {
  pulsanteEntra.disabled = true;
  try {
    const { utente } = await chiama('POST', '/accesso/conferma', { token });
    window.location.assign(utente.ruolo === 'logopedista' ? '../michele/' : '../');
  } catch (errore) {
    if (errore.stato === 0) {
      document.getElementById('messaggio-entra').textContent = errore.message;
      pulsanteEntra.disabled = false;
      return;
    }
    entra.hidden = true;
    chiediLink.hidden = false;
    document.getElementById('spiegazione-link').textContent = `${errore.message}.`;
  }
});

if (token) entra.hidden = false;
else chiediLink.hidden = false;
