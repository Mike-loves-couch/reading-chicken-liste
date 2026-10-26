import { formattaData, formattaDurata } from '../formato.js';
import { totaleRiprova } from '../partita.js';
import { creaRiga, paragrafo, tabellaParole } from './dom.js';

export function creaSchermataStorico({ storico, suIndietro }) {
  const elenco = document.getElementById('storico-elenco');
  const dettaglio = document.getElementById('storico-dettaglio');
  const cancella = document.getElementById('storico-cancella');

  function mostraElenco() {
    dettaglio.hidden = true;
    elenco.hidden = false;
    const partite = storico.elenco();
    cancella.hidden = !partite || partite.length === 0;
    if (partite === null) {
      elenco.replaceChildren(paragrafo('Lo storico non è disponibile in questo browser.', 'avviso'));
      return;
    }
    if (partite.length === 0) {
      elenco.replaceChildren(paragrafo('Nessuna partita salvata.'));
      return;
    }
    const tabella = document.createElement('table');
    tabella.className = 'tabella';
    const testata = document.createElement('thead');
    testata.append(creaRiga(['Data', 'Tipo', 'Lista', 'Quante', 'Riprova', 'Durata'], 'th'));
    const corpo = document.createElement('tbody');
    for (const partita of partite) {
      const riga = creaRiga([
        formattaData(partita.data),
        partita.tipo,
        partita.lista,
        String(partita.quantita),
        String(totaleRiprova(partita.parole)),
        formattaDurata(partita.durataSecondi),
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
      `${formattaData(partita.data)} · ${partita.lista} · ${formattaDurata(partita.durataSecondi)}`,
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
