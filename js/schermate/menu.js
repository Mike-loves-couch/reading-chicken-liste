import { DIGRAMMI, TRIGRAMMI, filtraGruppi, opzioniQuantita } from '../liste.js';
import { temaDa } from '../temi.js';

export function creaMenu({ datiListe, storico, suGioca, suStorico, suTema }) {
  const scelte = {
    tipo: null,
    lista: null,
    quantita: null,
    maiuscolo: storico.leggiMaiuscolo(),
    gruppi: storico.leggiGruppi(),
    tema: temaDa(storico.leggiTema()).nome,
  };
  const elencoListe = document.getElementById('elenco-liste');
  const elencoQuantita = document.getElementById('elenco-quantita');
  const pulsanteGioca = document.getElementById('pulsante-gioca');
  // Firefox ripristina lo stato dei campi dopo un ricaricamento: si riparte sempre da zero
  for (const radio of document.querySelectorAll('input[name="tipo"]')) radio.checked = false;

  function creaScelta({ nome, valore, etichetta, attiva }) {
    const label = document.createElement('label');
    label.className = 'scelta';
    if (!attiva) label.classList.add('disattivata');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = nome;
    input.value = valore;
    input.disabled = !attiva;
    label.append(input, ` ${etichetta}`);
    return { label, input };
  }

  function aggiorna() {
    pulsanteGioca.disabled = !(scelte.tipo && scelte.lista && scelte.quantita);
  }

  // le voci della lista scelta che rispettano digrammi e trigrammi ammessi
  function elementiAmmessi() {
    return filtraGruppi(scelte.lista.elementi, scelte.gruppi);
  }

  function mostraQuantita() {
    if (!scelte.lista) {
      elencoQuantita.replaceChildren(suggerimento('Scegli prima una lista.'));
      return;
    }
    const opzioni = opzioniQuantita(elementiAmmessi().length);
    elencoQuantita.replaceChildren();
    for (const opzione of opzioni) {
      const { label, input } = creaScelta({
        nome: 'quantita',
        valore: String(opzione.valore),
        etichetta: opzione.etichetta,
        attiva: opzione.attiva,
      });
      input.addEventListener('change', () => {
        scelte.quantita = opzione.valore;
        aggiorna();
      });
      // con una sola opzione ("Tutte (N)") la scelta è già fatta
      if (opzioni.length === 1) {
        input.checked = true;
        scelte.quantita = opzione.valore;
      }
      elencoQuantita.append(label);
    }
  }

  function mostraListe(liste) {
    elencoListe.replaceChildren();
    for (const lista of liste) {
      const vuota = filtraGruppi(lista.elementi, scelte.gruppi).length === 0;
      const { label, input } = creaScelta({
        nome: 'lista',
        valore: lista.nome,
        etichetta: vuota ? `${lista.nome} (vuota)` : lista.nome,
        attiva: !vuota,
      });
      input.addEventListener('change', () => {
        scelte.lista = lista;
        scelte.quantita = null;
        mostraQuantita();
        aggiorna();
      });
      elencoListe.append(label);
    }
  }

  function suggerimento(testo) {
    const p = document.createElement('p');
    p.className = 'suggerimento';
    p.textContent = testo;
    return p;
  }

  for (const tipo of ['sillabe', 'parole']) {
    const radio = document.querySelector(`input[name="tipo"][value="${tipo}"]`);
    const dati = datiListe[tipo];
    if (dati.errore) {
      radio.disabled = true;
      radio.closest('.scelta').classList.add('disattivata');
      const avviso = document.getElementById(`errore-${tipo}`);
      avviso.textContent = `Non riesco a caricare ${dati.url}: ${dati.errore}`;
      avviso.hidden = false;
      continue;
    }
    radio.addEventListener('change', () => {
      scelte.tipo = tipo;
      scelte.lista = null;
      scelte.quantita = null;
      mostraListe(dati.liste);
      mostraQuantita();
      aggiorna();
    });
  }

  document.querySelector(`input[name="maiuscolo"][value="${scelte.maiuscolo ? 'si' : 'no'}"]`).checked = true;
  for (const radio of document.querySelectorAll('input[name="maiuscolo"]')) {
    radio.addEventListener('change', () => {
      scelte.maiuscolo = radio.value === 'si';
      storico.salvaMaiuscolo(scelte.maiuscolo);
    });
  }

  // includere o escludere le voci con ciascun digramma e trigramma: elenco e quantità si ricalcolano
  const singole = [...document.querySelectorAll('input[data-gruppo]')];
  const tutte = {
    digrammi: { casella: document.getElementById('tutti-digrammi'), nomi: DIGRAMMI },
    trigrammi: { casella: document.getElementById('tutti-trigrammi'), nomi: TRIGRAMMI },
  };

  // "Tutti" è spuntato se lo sono tutte le sue caselle, a metà se solo alcune
  function sincronizzaTutte() {
    for (const { casella, nomi } of Object.values(tutte)) {
      const attive = nomi.filter((nome) => scelte.gruppi[nome]).length;
      casella.checked = attive === nomi.length;
      casella.indeterminate = attive > 0 && attive < nomi.length;
    }
  }

  function gruppiCambiati() {
    storico.salvaGruppi(scelte.gruppi);
    sincronizzaTutte();
    if (!scelte.tipo) return;
    const nomeLista = scelte.lista?.nome;
    scelte.lista = null;
    scelte.quantita = null;
    mostraListe(datiListe[scelte.tipo].liste);
    for (const input of elencoListe.querySelectorAll('input')) {
      if (input.value === nomeLista && !input.disabled) {
        input.checked = true;
        scelte.lista = datiListe[scelte.tipo].liste.find((lista) => lista.nome === nomeLista);
      }
    }
    mostraQuantita();
    aggiorna();
  }

  for (const casella of singole) {
    const nome = casella.dataset.gruppo;
    casella.checked = scelte.gruppi[nome];
    casella.addEventListener('change', () => {
      scelte.gruppi = { ...scelte.gruppi, [nome]: casella.checked };
      gruppiCambiati();
    });
  }
  for (const { casella, nomi } of Object.values(tutte)) {
    casella.addEventListener('change', () => {
      const valore = casella.checked;
      scelte.gruppi = { ...scelte.gruppi, ...Object.fromEntries(nomi.map((nome) => [nome, valore])) };
      for (const singola of singole) if (nomi.includes(singola.dataset.gruppo)) singola.checked = valore;
      gruppiCambiati();
    });
  }
  sincronizzaTutte();

  document.querySelector(`input[name="tema"][value="${scelte.tema}"]`).checked = true;
  suTema(scelte.tema);
  for (const radio of document.querySelectorAll('input[name="tema"]')) {
    radio.addEventListener('change', () => {
      scelte.tema = radio.value;
      storico.salvaTema(scelte.tema);
      suTema(scelte.tema);
    });
  }

  pulsanteGioca.addEventListener('click', (evento) => {
    evento.currentTarget.blur();
    // la partita pesca solo tra le voci ammesse
    suGioca({ ...scelte, lista: { ...scelte.lista, elementi: elementiAmmessi() } });
  });
  document.getElementById('pulsante-storico').addEventListener('click', suStorico);
  aggiorna();
}
