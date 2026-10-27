import { chiama } from '../js/api.js';
import { collegaRichiestaLink } from '../js/richiesta-link.js';

const SEZIONI = ['caricamento', 'accesso', 'non-logopedista', 'area-logopedista'];
const messaggio = document.getElementById('messaggio');
const elenco = document.getElementById('elenco-famiglie');

function mostra(id) {
  for (const sezione of SEZIONI) document.getElementById(sezione).hidden = sezione !== id;
}

function avvisa(testo, errore = false) {
  messaggio.textContent = testo;
  messaggio.classList.toggle('avviso', errore);
}

function elemento(tag, testo, classe) {
  const nodo = document.createElement(tag);
  if (testo !== undefined) nodo.textContent = testo;
  if (classe) nodo.className = classe;
  return nodo;
}

function pulsante(testo, suClic) {
  const nodo = elemento('button', testo, 'pulsante secondario piccolo');
  nodo.type = 'button';
  nodo.addEventListener('click', suClic);
  return nodo;
}

// fa una modifica sul server, dice com'è andata e ricarica l'elenco
async function azione(fai, esito) {
  try {
    await fai();
    avvisa(esito);
  } catch (errore) {
    avvisa(errore.message, true);
  }
  await caricaFamiglie();
}

function rigaProfilo(bambino) {
  const riga = elemento('li', undefined, bambino.archiviato ? 'bambino archiviato' : 'bambino');
  riga.append(
    elemento('span', bambino.archiviato ? `${bambino.nome} (profilo archiviato)` : bambino.nome),
    pulsante('Rinomina', () => {
      const nome = window.prompt('Nuovo nome di fantasia', bambino.nome);
      if (nome) azione(() => chiama('PATCH', `/bambini/${bambino.id}`, { nome }), `Profilo rinominato: ${nome}`);
    }),
    pulsante(bambino.archiviato ? 'Ripristina' : 'Archivia', () => azione(
      () => chiama('PATCH', `/bambini/${bambino.id}`, { archiviato: !bambino.archiviato }),
      bambino.archiviato ? `Profilo di ${bambino.nome} ripristinato` : `Profilo di ${bambino.nome} archiviato`,
    )),
  );
  return riga;
}

function schedaFamiglia(famiglia) {
  const nome = famiglia.nome ?? famiglia.email;
  const scheda = elemento('article', undefined, 'riquadro famiglia');
  scheda.append(elemento('h3', nome));
  if (famiglia.nome) scheda.append(elemento('p', famiglia.email, 'email'));
  const profili = elemento('ul', undefined, 'bambini');
  profili.append(...famiglia.bambini.map(rigaProfilo));
  const comandi = elemento('div', undefined, 'comandi-famiglia');
  comandi.append(
    pulsante('Aggiungi profilo', () => {
      const nuovo = window.prompt('Nome di fantasia del nuovo profilo');
      if (nuovo) azione(() => chiama('POST', `/famiglie/${famiglia.id}/bambini`, { nome: nuovo }), `Profilo aggiunto: ${nuovo}`);
    }),
    pulsante('Rimanda invito', () => azione(
      () => chiama('POST', `/famiglie/${famiglia.id}/invito`),
      `Invito rimandato a ${famiglia.email}`,
    )),
    pulsante('Elimina famiglia', () => {
      if (window.confirm(`Eliminare ${nome} con tutti i profili e i risultati? Non si può annullare.`)) {
        azione(() => chiama('DELETE', `/famiglie/${famiglia.id}`), `${nome}: famiglia eliminata`);
      }
    }),
  );
  scheda.append(profili, comandi);
  return scheda;
}

async function caricaFamiglie() {
  try {
    const { famiglie } = await chiama('GET', '/famiglie');
    elenco.replaceChildren(...(famiglie.length > 0 ? famiglie.map(schedaFamiglia) : [elemento('p', 'Nessuna famiglia invitata.')]));
  } catch (errore) {
    avvisa(errore.message, true);
  }
}

document.getElementById('modulo-invito').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const modulo = evento.currentTarget;
  const email = modulo.elements.email.value;
  const bambini = modulo.elements.bambini.value.split(',').map((nome) => nome.trim()).filter(Boolean);
  azione(async () => {
    await chiama('POST', '/famiglie', { email, nome: modulo.elements.nome.value, bambini });
    modulo.reset();
  }, `Invito mandato a ${email}`);
});

document.getElementById('pulsante-esci').addEventListener('click', async () => {
  await chiama('POST', '/esci').catch(() => {});
  window.location.reload();
});

collegaRichiestaLink(document.getElementById('modulo-link'), document.getElementById('messaggio-link'));

async function avvia() {
  try {
    const { utente } = await chiama('GET', '/io');
    if (utente.ruolo !== 'logopedista') {
      mostra('non-logopedista');
      return;
    }
    document.getElementById('chi-sei').textContent = utente.nome ?? utente.email;
    mostra('area-logopedista');
    await caricaFamiglie();
  } catch (errore) {
    mostra('accesso');
    if (errore.stato !== 401) {
      const avviso = document.getElementById('messaggio-link');
      avviso.textContent = errore.message;
      avviso.classList.add('avviso');
    }
  }
}

avvia();
