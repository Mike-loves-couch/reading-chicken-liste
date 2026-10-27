import { creaCasuale, semeCasuale } from '../casuale.js';
import { creaDisegnatore } from '../disegno.js';
import { collegaTastiera } from '../input.js';
import { dimensioniPer, generaLabirinto } from '../labirinto.js';
import { formatta, pescaParole } from '../liste.js';
import { scegliGuardiani } from '../mappa.js';
import { temaDa } from '../temi.js';
import { corretta, creaPartita, muovi, riprova } from '../partita.js';

// lascia finire il passo del pollo prima di mostrare la parola
const ATTESA_PAROLA_MS = 130;
// il suono dell'uscita che si apre parte dopo quello di "Corretta", non sopra
const ATTESA_SUONO_USCITA_MS = 300;

export function creaSchermataGioco({ immagini, suoni, salva, suFine, suEsci }) {
  const disegnatore = creaDisegnatore(document.getElementById('canvas-labirinto'), immagini);
  const contatore = document.getElementById('contatore');
  const pannello = document.getElementById('pannello-parola');
  const testo = document.getElementById('parola-testo');
  const festa = document.getElementById('festa');
  let partita = null;
  let impostazioni = null;
  let inizio = 0;
  let scollegaTastiera = null;

  // Con la parola a schermo Invio e Spazio non devono attivare i pulsanti:
  // valuta solo il genitore, col mouse.
  window.addEventListener('keydown', (evento) => {
    if (partita?.stato === 'parola' && (evento.key === 'Enter' || evento.key === ' ')) evento.preventDefault();
  }, true);

  window.addEventListener('resize', () => disegnatore.adatta());

  function aggiornaContatore() {
    contatore.textContent = `${partita.lette} / ${partita.parole.length}`;
  }

  function mostraParola() {
    if (partita?.stato !== 'parola') return;
    testo.textContent = formatta(partita.parole[partita.lette].testo, impostazioni.maiuscolo);
    testo.classList.remove('trema');
    pannello.hidden = false;
    suoni.suona('parola');
  }

  function gestisci(esito) {
    if (esito.tipo === 'bloccato') suoni.suona('muro');
    if (esito.tipo === 'mosso' || esito.tipo === 'parola' || esito.tipo === 'uscita') {
      disegnatore.animaPasso(esito.da, esito.a);
      suoni.suona('passo');
    }
    if (esito.tipo === 'parola') setTimeout(mostraParola, ATTESA_PAROLA_MS);
    if (esito.tipo === 'uscita') finisci();
  }

  // conta solo un singolo vero clic del mouse: i clic da tastiera hanno detail 0,
  // il secondo clic di un doppio clic ha detail 2
  document.getElementById('pulsante-corretta').addEventListener('click', (evento) => {
    if (evento.detail !== 1 || partita?.stato !== 'parola') return;
    evento.currentTarget.blur();
    const esito = corretta(partita);
    pannello.hidden = true;
    disegnatore.animaPresa(partita.pollo);
    aggiornaContatore();
    suoni.suona('corretta');
    if (esito.recintoAperto) {
      disegnatore.apriUscita();
      setTimeout(() => suoni.suona('uscita'), ATTESA_SUONO_USCITA_MS);
    }
  });

  document.getElementById('pulsante-riprova').addEventListener('click', (evento) => {
    if (evento.detail !== 1 || partita?.stato !== 'parola') return;
    evento.currentTarget.blur();
    riprova(partita);
    suoni.suona('riprova');
    testo.classList.remove('trema');
    void testo.offsetWidth; // forza il riavvio dell'animazione
    testo.classList.add('trema');
  });

  document.getElementById('pulsante-esci').addEventListener('click', (evento) => {
    evento.currentTarget.blur();
    if (partita?.stato === 'finita') return; // partita conclusa: la festa porta al riepilogo
    if (!window.confirm('Vuoi uscire? Questa partita non verrà salvata.')) return;
    ferma();
    suEsci();
  });

  async function finisci() {
    const conclusa = partita;
    const durataSecondi = Math.round((performance.now() - inizio) / 1000);
    const risultato = { ...impostazioni, durataSecondi, parole: conclusa.parole };
    // si salva all'arrivo, non dopo la festa: chiudere la scheda durante i 3 secondi non perde la partita
    const salvata = salva(risultato);
    festa.hidden = false;
    suoni.suona('festa');
    await disegnatore.festa();
    if (partita !== conclusa) return; // nel frattempo si è usciti
    ferma();
    suFine({ ...risultato, salvata });
  }

  function ferma() {
    scollegaTastiera?.();
    scollegaTastiera = null;
    partita = null;
    pannello.hidden = true;
    festa.hidden = true;
    disegnatore.ferma();
  }

  return {
    // da chiamare con la schermata già visibile, così il canvas misura lo spazio giusto
    avvia(nuoveImpostazioni) {
      ferma();
      impostazioni = nuoveImpostazioni;
      const casuale = creaCasuale(semeCasuale());
      const parole = pescaParole(impostazioni.lista.elementi, impostazioni.quantita, casuale);
      const { colonne, righe } = dimensioniPer(parole.length);
      partita = creaPartita({ labirinto: generaLabirinto(colonne, righe, casuale), parole, casuale });
      aggiornaContatore();
      const tema = temaDa(impostazioni.tema);
      disegnatore.avvia(tema, partita, scegliGuardiani(partita.chicchi, casuale, tema), casuale);
      scollegaTastiera = collegaTastiera(window, (direzione) => {
        if (partita) gestisci(muovi(partita, direzione));
      });
      inizio = performance.now();
    },
    ferma,
  };
}
