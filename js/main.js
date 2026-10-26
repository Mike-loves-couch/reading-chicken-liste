import { caricaImmagini } from './disegno.js';
import { caricaTutto } from './liste.js';
import { creaRecord, creaStorico } from './storico.js';
import { creaSchermataGioco } from './schermate/gioco.js';
import { creaMenu } from './schermate/menu.js';
import { mostraRiepilogo } from './schermate/riepilogo.js';
import { creaSchermataStorico } from './schermate/storico.js';

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

function mostraErrore(evento) {
  console.error(evento.error ?? evento.reason ?? evento);
  document.getElementById('pannello-errore').hidden = false;
}

window.addEventListener('error', mostraErrore);
window.addEventListener('unhandledrejection', mostraErrore);
// ricaricare riporta al menu con uno stato pulito; lo storico è già salvato
document.getElementById('errore-menu').addEventListener('click', () => window.location.reload());

async function avvia() {
  const storico = creaStorico(prendiStorage());
  const [datiListe, immagini] = await Promise.all([caricaTutto(), caricaImmagini()]);

  const schermataStorico = creaSchermataStorico({ storico, suIndietro: () => mostra('menu') });

  const gioco = creaSchermataGioco({
    immagini,
    suEsci: () => mostra('menu'),
    suFine: (risultato) => {
      const salvata = storico.salva(creaRecord({
        data: new Date(),
        tipo: risultato.tipo,
        lista: risultato.lista.nome,
        maiuscolo: risultato.maiuscolo,
        durataSecondi: risultato.durataSecondi,
        parole: risultato.parole,
      }));
      mostraRiepilogo({ ...risultato, nomeLista: risultato.lista.nome, salvata });
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
  });

  document.getElementById('riepilogo-menu').addEventListener('click', () => mostra('menu'));
  mostra('menu');
}

avvia();
