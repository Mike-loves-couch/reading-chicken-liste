import { etichettaTipo, formattaData, formattaSecondi } from '../formato.js';
import { tempoMedio, totaleRiprova } from '../partita.js';
import { creaRiga, paragrafo, tabellaParole } from './dom.js';

// remoto(): null per lo storico del browser, oppure { nome, carica } per le partite di un profilo
// lette dal server. Lo storico del server non si cancella da qui.
export function creaSchermataStorico({ storico, suIndietro, remoto = () => null }) {
  const titolo = document.getElementById('storico-titolo');
  const elenco = document.getElementById('storico-elenco');
  const dettaglio = document.getElementById('storico-dettaglio');
  const cancella = document.getElementById('storico-cancella');

  async function mostraElenco() {
    dettaglio.hidden = true;
    elenco.hidden = false;
    const fonte = remoto();
    titolo.textContent = fonte ? `Storico di ${fonte.nome}` : 'Storico';
    if (fonte) {
      cancella.hidden = true;
      elenco.replaceChildren(paragrafo('Caricamento…'));
      try {
        disegnaElenco(await fonte.carica());
      } catch (errore) {
        elenco.replaceChildren(paragrafo(`Non riesco a leggere lo storico: ${errore.message}`, 'avviso'));
      }
      return;
    }
    const partite = storico.elenco();
    cancella.hidden = !partite || partite.length === 0;
    if (partite === null) {
      elenco.replaceChildren(paragrafo('Lo storico non è disponibile in questo browser.', 'avviso'));
      return;
    }
    disegnaElenco(partite);
  }

  function disegnaElenco(partite) {
    if (partite.length === 0) {
      elenco.replaceChildren(paragrafo('Nessuna partita salvata.'));
      return;
    }
    const tabella = document.createElement('table');
    tabella.className = 'tabella';
    const testata = document.createElement('thead');
    testata.append(creaRiga(['Data', 'Tipo', 'Lista', 'Quante', 'Riprova', 'Tempo medio'], 'th'));
    const corpo = document.createElement('tbody');
    for (const partita of partite) {
      const riga = creaRiga([
        formattaData(partita.data),
        etichettaTipo(partita.tipo),
        partita.lista,
        String(partita.quantita),
        String(totaleRiprova(partita.parole)),
        formattaSecondi(tempoMedio(partita.parole)),
      ]);
      riga.classList.add('cliccabile');
      riga.addEventListener('click', () => mostraDettaglio(partita));
      corpo.append(riga);
    }
    tabella.append(testata, corpo);
    elenco.replaceChildren(tabella);
  }

  function mostraDettaglio(partita) {
    elenco.hidden = true;
    cancella.hidden = true;
    const titolo = paragrafo(
      `${formattaData(partita.data)} · ${partita.lista} · Tempo medio: ${formattaSecondi(tempoMedio(partita.parole))}`,
      'intestazione',
    );
    dettaglio.replaceChildren(titolo, tabellaParole(partita.tipo, partita.parole, partita.maiuscolo));
    dettaglio.hidden = false;
  }

  document.getElementById('storico-indietro').addEventListener('click', () => {
    if (!dettaglio.hidden) mostraElenco();
    else suIndietro();
  });

  cancella.addEventListener('click', () => {
    if (!window.confirm('Cancellare tutte le partite salvate?')) return;
    storico.cancella();
    mostraElenco();
  });

  return { mostra: mostraElenco };
}
