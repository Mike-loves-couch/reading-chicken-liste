import { creaCasuale, semeCasuale } from '../casuale.js';
import { creaDisegnatore } from '../disegno.js';
import { collegaTastiera } from '../input.js';
import { dimensioniPer, generaLabirinto } from '../labirinto.js';
import { formatta, pescaParole } from '../liste.js';
import { corretta, creaPartita, muovi, riprova } from '../partita.js';

// lascia finire il passo del pollo prima di mostrare la parola
const ATTESA_PAROLA_MS = 130;

export function creaSchermataGioco({ immagini, suFine, suEsci }) {
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
  }

  function gestisci(esito) {
    if (esito.tipo === 'mosso' || esito.tipo === 'parola' || esito.tipo === 'uscita') {
      disegnatore.animaPasso(esito.da, esito.a);
    }
    if (esito.tipo === 'parola') setTimeout(mostraParola, ATTESA_PAROLA_MS);
    if (esito.tipo === 'uscita') finisci();
  }

  // detail === 0 vuol dire clic generato dalla tastiera: lo ignoriamo
  document.getElementById('pulsante-corretta').addEventListener('click', (evento) => {
    if (evento.detail === 0 || partita?.stato !== 'parola') return;
    evento.currentTarget.blur();
    const esito = corretta(partita);
    pannello.hidden = true;
    disegnatore.animaMangia(partita.pollo);
    aggiornaContatore();
    if (esito.recintoAperto) disegnatore.apriRecinto();
  });

  document.getElementById('pulsante-riprova').addEventListener('click', (evento) => {
    if (evento.detail === 0 || partita?.stato !== 'parola') return;
    evento.currentTarget.blur();
    riprova(partita);
    testo.classList.remove('trema');
    void testo.offsetWidth; // forza il riavvio dell'animazione
    testo.classList.add('trema');
  });

  document.getElementById('pulsante-esci').addEventListener('click', (evento) => {
    evento.currentTarget.blur();
    if (partita?.stato === 'finita') return; // partita conclusa: la festa porta al riepilogo e la salva
    if (!window.confirm('Vuoi uscire? Questa partita non verrà salvata.')) return;
    ferma();
    suEsci();
  });

  async function finisci() {
    const conclusa = partita;
    const durataSecondi = Math.round((performance.now() - inizio) / 1000);
    festa.hidden = false;
    await disegnatore.festa();
    if (partita !== conclusa) return; // nel frattempo si è usciti
    ferma();
    suFine({ ...impostazioni, durataSecondi, parole: conclusa.parole });
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
      disegnatore.avvia(partita);
      scollegaTastiera = collegaTastiera(window, (direzione) => {
        if (partita) gestisci(muovi(partita, direzione));
      });
      inizio = performance.now();
    },
    ferma,
  };
}
