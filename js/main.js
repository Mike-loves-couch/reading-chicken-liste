import { caricaImmagini } from './disegno.js';
import { caricaTutto } from './liste.js';
import { creaRecord, creaStorico } from './storico.js';
import { creaSchermataGioco } from './schermate/gioco.js';
import { creaMenu } from './schermate/menu.js';
import { mostraRiepilogo } from './schermate/riepilogo.js';
import { creaSchermataStorico } from './schermate/storico.js';
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
  const [datiListe, immagini] = await Promise.all([caricaTutto(), caricaImmagini(immaginiDeiTemi())]);

  const schermataStorico = creaSchermataStorico({ storico, suIndietro: () => mostra('menu') });

  const gioco = creaSchermataGioco({
    immagini,
    suEsci: () => mostra('menu'),
    salva: (risultato) => storico.salva(creaRecord({
      data: new Date(),
      tipo: risultato.tipo,
      lista: risultato.lista.nome,
      maiuscolo: risultato.maiuscolo,
      durataSecondi: risultato.durataSecondi,
      parole: risultato.parole,
    })),
    suFine: (risultato) => {
      mostraRiepilogo({ ...risultato, nomeLista: risultato.lista.nome });
      mostra('riepilogo');
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
