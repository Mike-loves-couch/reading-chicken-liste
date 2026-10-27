import { chiama } from './api.js';

// Modulo "scrivi la tua email e ti mandiamo un link": in /accedi/ e nella pagina del logopedista.
export function collegaRichiestaLink(modulo, messaggio) {
  modulo.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const pulsante = modulo.querySelector('button');
    pulsante.disabled = true;
    try {
      await chiama('POST', '/accesso/richiesta', { email: modulo.elements.email.value });
      messaggio.textContent = "Se l'indirizzo è registrato, ti abbiamo mandato un link per entrare. Controlla anche la posta indesiderata.";
      messaggio.classList.remove('avviso');
    } catch (errore) {
      messaggio.textContent = errore.message;
      messaggio.classList.add('avviso');
    } finally {
      pulsante.disabled = false;
    }
  });
}
