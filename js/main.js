import { leggiAccount } from './account.js';
import { chiama } from './api.js';
import { creaCoda } from './coda.js';
import { caricaImmagini } from './disegno.js';
import { caricaTutto } from './liste.js';
import { nuovoId, partitaDalServer, partitaPerIlServer } from './risultati.js';
import { collegaAccount } from './schermate/account.js';
import { creaRecord, creaStorico } from './storico.js';
import { creaSchermataGioco } from './schermate/gioco.js';
import { creaMenu } from './schermate/menu.js';
import { mostraInvio, mostraRiepilogo } from './schermate/riepilogo.js';
import { creaSchermataStorico } from './schermate/storico.js';
import { creaSuoni } from './suoni.js';
import { immaginiDeiTemi, temaDa } from './temi.js';

const SCHERMATE = ['caricamento', 'menu', 'gioco', 'riepilogo', 'storico'];

function mostra(nome) {
  for (const schermata of SCHERMATE) {
    document.getElementById(`schermata-${schermata}`).hidden = schermata !== nome;
  }
}

// Alcuni browser lanciano un errore già solo leggendo window.localStorage.
function prendiStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// colori della pagina, pollo del titolo e icona del contatore del mondo scelto
function applicaTema(nome) {
  const tema = temaDa(nome);
  document.body.dataset.tema = tema.nome;
  document.getElementById('mascotte').src = tema.icone.mascotte;
  document.getElementById('icona-contatore').src = tema.icone.contatore;
}

// pulsante con l'altoparlante nella barra del gioco: accende e spegne i suoni, la scelta resta
function collegaPulsanteSuoni(suoni, storico) {
  const pulsante = document.getElementById('pulsante-suoni');
  pulsante.setAttribute('aria-pressed', String(storico.leggiSuoni()));
  pulsante.addEventListener('click', (evento) => {
    evento.currentTarget.blur();
    const attivi = pulsante.getAttribute('aria-pressed') !== 'true';
    pulsante.setAttribute('aria-pressed', String(attivi));
    suoni.impostaAttivi(attivi);
    storico.salvaSuoni(attivi);
  });
}

function mostraErrore(evento) {
  console.error(evento.error ?? evento.reason ?? evento);
  document.getElementById('errore-dettaglio').textContent = evento.error?.message ?? evento.reason?.message ?? '';
  document.getElementById('pannello-errore').hidden = false;
}

window.addEventListener('error', mostraErrore);
window.addEventListener('unhandledrejection', mostraErrore);
// ricaricare riporta al menu con uno stato pulito; lo storico è già salvato
document.getElementById('errore-menu').addEventListener('click', () => window.location.reload());

async function avvia() {
  const storico = creaStorico(prendiStorage());
  applicaTema(storico.leggiTema()); // niente lampo dei colori della fattoria durante il caricamento
  const suoni = creaSuoni({ attivi: storico.leggiSuoni() }); // i file si scaricano mentre carica il resto
  for (const gesto of ['pointerdown', 'keydown']) window.addEventListener(gesto, () => suoni.sblocca());
  collegaPulsanteSuoni(suoni, storico);
  const [datiListe, immagini, account] = await Promise.all([
    caricaTutto(), caricaImmagini(immaginiDeiTemi()), leggiAccount(),
  ]);
  const chiGioca = collegaAccount({ account, storico });
  const coda = creaCoda(prendiStorage(), (partita) => chiama('POST', '/partite', partita));
  // le partite rimaste da una volta precedente (per esempio giocate senza rete) partono adesso
  let invio = account.stato === 'dentro' ? coda.inviaTutto() : Promise.resolve({ rimaste: 0, scartate: [] });
  let bambinoDellaPartita = null;
  let idDellaPartita = null;

  const schermataStorico = creaSchermataStorico({
    storico,
    suIndietro: () => mostra('menu'),
    remoto: () => {
      const bambino = chiGioca.bambino();
      if (!bambino) return null;
      return {
        nome: bambino.nome,
        carica: async () => (await chiama('GET', `/bambini/${bambino.id}/partite`)).partite.map(partitaDalServer),
      };
    },
  });

  const gioco = creaSchermataGioco({
    immagini,
    suoni,
    suEsci: () => mostra('menu'),
    salva: (risultato) => {
      const record = creaRecord({
        data: new Date(),
        tipo: risultato.tipo,
        lista: risultato.lista.nome,
        maiuscolo: risultato.maiuscolo,
        durataSecondi: risultato.durataSecondi,
        parole: risultato.parole,
      });
      const salvata = storico.salva(record); // lo storico del browser non dipende dal server
      bambinoDellaPartita = chiGioca.bambino();
      if (bambinoDellaPartita) {
        idDellaPartita = nuovoId();
        coda.aggiungi(partitaPerIlServer(record, bambinoDellaPartita.id, idDellaPartita));
        invio = coda.inviaTutto();
      }
      return salvata;
    },
    suFine: async (risultato) => {
      mostraRiepilogo({ ...risultato, nomeLista: risultato.lista.nome });
      mostra('riepilogo');
      if (!bambinoDellaPartita) return;
      const { rimaste, scartate } = await invio;
      const esito = scartate.includes(idDellaPartita) ? 'rifiutato' : rimaste === 0 ? 'inviato' : 'in-attesa';
      mostraInvio(bambinoDellaPartita.nome, esito);
    },
  });

  creaMenu({
    datiListe,
    storico,
    suGioca: (impostazioni) => {
      mostra('gioco');
      gioco.avvia(impostazioni);
    },
    suStorico: () => {
      schermataStorico.mostra();
      mostra('storico');
    },
    suTema: applicaTema,
  });

  document.getElementById('riepilogo-menu').addEventListener('click', () => mostra('menu'));
  mostra('menu');
}

avvia();
