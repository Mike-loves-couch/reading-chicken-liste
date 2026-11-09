import { DIGRAMMI, FREQUENZE, TRIGRAMMI, elementiDelleListe, opzioniQuantita, senzaNumero, unisciListe } from '../liste.js';
import { calcolaAbilita, chiaveGruppo, coloreVelocita, quotaParole } from '../abilita.js';
import { formattaSecondi } from '../formato.js';
import { temaDa } from '../temi.js';

// partiteDelGiocatore(): le partite di chi gioca (del browser o del profilo scelto), per le barre di abilità
export function creaMenu({ datiListe, storico, suGioca, suStorico, suTema, partiteDelGiocatore = async () => [] }) {
  const scelte = {
    tipo: null,
    quantita: null,
    maiuscolo: storico.leggiMaiuscolo(),
    gruppi: storico.leggiGruppi(),
    frequenze: storico.leggiFrequenze(),
    doppie: storico.leggiDoppie(),
    tema: temaDa(storico.leggiTema()).nome,
  };
  // i nomi delle liste spuntate: se ne possono scegliere più di una
  const selezionate = new Set();
  // l'abilità in ogni lista (null finché non si conoscono le partite)
  let abilita = null;
  const elencoListe = document.getElementById('elenco-liste');
  const elencoQuantita = document.getElementById('elenco-quantita');
  const pulsanteGioca = document.getElementById('pulsante-gioca');
  const riquadroFrequenza = document.getElementById('riquadro-frequenza');
  // Firefox ripristina lo stato dei campi dopo un ricaricamento: si riparte sempre da zero
  for (const radio of document.querySelectorAll('input[name="tipo"]')) radio.checked = false;

  function creaScelta({ nome, valore, etichetta, attiva, tipoCampo = 'radio' }) {
    const label = document.createElement('label');
    label.className = 'scelta';
    if (!attiva) label.classList.add('disattivata');
    const input = document.createElement('input');
    input.type = tipoCampo;
    input.name = nome;
    input.value = valore;
    input.disabled = !attiva;
    label.append(input, ` ${etichetta}`);
    return { label, input };
  }

  function aggiorna() {
    pulsanteGioca.disabled = !(scelte.tipo && selezionate.size > 0 && scelte.quantita);
  }

  const listeDelTipo = () => (scelte.tipo ? datiListe[scelte.tipo].liste : []);
  const listeScelte = () => listeDelTipo().filter((lista) => selezionate.has(lista.nome));
  const opzioniFiltro = () => ({ frequenze: scelte.frequenze, doppie: scelte.doppie, gruppi: scelte.gruppi });

  // le voci delle liste scelte che rispettano frequenza, digrammi e trigrammi ammessi
  function elementiAmmessi() {
    return elementiDelleListe(listeScelte(), opzioniFiltro());
  }

  function mostraQuantita() {
    if (selezionate.size === 0) {
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

  // le liste dello stesso gruppo (per esempio lo stesso numero di sillabe) stanno sotto il suo nome,
  // con una casella per sceglierle tutte insieme
  function mostraListe(liste) {
    elencoListe.replaceChildren();
    const gruppi = new Map();
    for (const lista of liste) {
      const chiave = lista.gruppo ?? null;
      if (!gruppi.has(chiave)) gruppi.set(chiave, []);
      gruppi.get(chiave).push(lista);
    }
    sincronizzatori.length = 0;
    for (const [nomeGruppo, delGruppo] of gruppi) {
      const contenitore = document.createElement('div');
      let destinazione = elencoListe;
      if (nomeGruppo !== null) {
        contenitore.className = 'gruppo-liste';
        destinazione = document.createElement('div');
        destinazione.className = 'sottoliste';
        contenitore.append(creaCasellaGruppo(nomeGruppo, delGruppo), destinazione);
        elencoListe.append(contenitore);
      }
      for (const lista of delGruppo) destinazione.append(creaCasellaLista(lista));
    }
  }

  const sincronizzatori = [];

  // a fianco di ogni lista: la barra è piena in proporzione alle parole diverse lette,
  // il colore dice la velocità di lettura (più verde-azzurro = più veloce, più arancione = più lenta)
  function creaBarra(chiave, gruppo) {
    const contenitore = document.createElement('span');
    contenitore.className = 'abilita';
    const dati = abilita?.get(`${scelte.tipo}|${chiave}`);
    if (!dati) {
      contenitore.hidden = true;
      return contenitore;
    }
    const barra = document.createElement('span');
    barra.className = 'barra-abilita';
    const riempimento = document.createElement('span');
    riempimento.style.width = `${Math.round(quotaParole(dati) * 100)}%`;
    const colore = coloreVelocita(dati.mediana, gruppo);
    if (colore) riempimento.style.background = colore;
    barra.append(riempimento);
    const descrizione = dati.paroleDiverse === 0
      ? 'Nessuna parola letta'
      : `${dati.paroleDiverse} parole lette${dati.mediana === null ? '' : `, ${formattaSecondi(dati.mediana)} a parola`}`;
    contenitore.title = descrizione;
    contenitore.setAttribute('role', 'img');
    contenitore.setAttribute('aria-label', descrizione);
    contenitore.append(barra);
    if (dati.mediana !== null) {
      const tempo = document.createElement('span');
      tempo.className = 'tempo-abilita';
      tempo.textContent = formattaSecondi(dati.mediana);
      contenitore.append(tempo);
    }
    return contenitore;
  }

  // rilegge le partite di chi gioca e ridisegna le barre; senza storico disponibile non si mostrano
  let richiestaAbilita = 0;
  async function aggiornaAbilita() {
    const mia = ++richiestaAbilita;
    let partite = [];
    try {
      partite = await partiteDelGiocatore();
    } catch {
      partite = [];
    }
    if (mia !== richiestaAbilita) return; // nel frattempo è stato scelto un altro giocatore
    abilita = new Map();
    for (const tipo of ['sillabe', 'parole']) {
      if (datiListe[tipo].errore) continue;
      for (const [chiave, dati] of calcolaAbilita(partite, datiListe[tipo].liste, tipo)) abilita.set(`${tipo}|${chiave}`, dati);
    }
    if (scelte.tipo) mostraListe(listeDelTipo());
  }

  function creaCasellaLista(lista) {
    const vuota = elementiDelleListe([lista], opzioniFiltro()).length === 0;
    // una lista rimasta senza voci non può restare scelta
    if (vuota) selezionate.delete(lista.nome);
    const nomeMostrato = lista.etichetta ?? senzaNumero(lista.nome);
    const { label, input } = creaScelta({
      nome: 'lista',
      valore: lista.nome,
      etichetta: vuota ? `${nomeMostrato} (vuota)` : nomeMostrato,
      attiva: !vuota,
      tipoCampo: 'checkbox',
    });
    label.append(creaBarra(lista.nome, lista.gruppo));
    input.checked = selezionate.has(lista.nome);
    input.dataset.lista = lista.nome;
    input.addEventListener('change', () => {
      if (input.checked) selezionate.add(lista.nome);
      else selezionate.delete(lista.nome);
      cambiataSelezione();
    });
    return label;
  }

  function creaCasellaGruppo(nomeGruppo, delGruppo) {
    const utili = delGruppo.filter((lista) => elementiDelleListe([lista], opzioniFiltro()).length > 0);
    const { label, input } = creaScelta({
      nome: 'gruppo-liste',
      valore: nomeGruppo,
      etichetta: `${nomeGruppo} (tutte)`,
      attiva: utili.length > 0,
      tipoCampo: 'checkbox',
    });
    label.classList.add('scelta-gruppo');
    label.append(creaBarra(chiaveGruppo(nomeGruppo), nomeGruppo));
    const sincronizza = () => {
      const attive = utili.filter((lista) => selezionate.has(lista.nome)).length;
      input.checked = utili.length > 0 && attive === utili.length;
      input.indeterminate = attive > 0 && attive < utili.length;
    };
    input.addEventListener('change', () => {
      for (const lista of utili) {
        if (input.checked) selezionate.add(lista.nome);
        else selezionate.delete(lista.nome);
      }
      for (const casella of elencoListe.querySelectorAll('input[data-lista]')) {
        if (utili.some((lista) => lista.nome === casella.dataset.lista)) casella.checked = input.checked;
      }
      cambiataSelezione();
    });
    sincronizzatori.push(sincronizza);
    sincronizza();
    return label;
  }

  function cambiataSelezione() {
    scelte.quantita = null;
    for (const sincronizza of sincronizzatori) sincronizza();
    mostraQuantita();
    aggiorna();
  }

  // frequenza, digrammi e trigrammi cambiano le voci disponibili: elenco e quantità si ricalcolano
  function ricalcola() {
    if (!scelte.tipo) return;
    scelte.quantita = null;
    mostraListe(listeDelTipo());
    mostraQuantita();
    aggiorna();
  }

  // il riquadro serve solo se qualche lista ha le voci divise per frequenza o l'elenco delle doppie
  function mostraRiquadroFrequenza() {
    riquadroFrequenza.hidden = !listeDelTipo().some((lista) => lista.frequenze || lista.doppie);
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
      selezionate.clear();
      mostraRiquadroFrequenza();
      ricalcola();
    });
  }

  document.querySelector(`input[name="maiuscolo"][value="${scelte.maiuscolo ? 'si' : 'no'}"]`).checked = true;
  for (const radio of document.querySelectorAll('input[name="maiuscolo"]')) {
    radio.addEventListener('change', () => {
      scelte.maiuscolo = radio.value === 'si';
      storico.salvaMaiuscolo(scelte.maiuscolo);
    });
  }

  // alta e bassa frequenza: almeno una resta sempre scelta
  for (const casella of document.querySelectorAll('input[data-frequenza]')) {
    const nome = casella.dataset.frequenza;
    casella.checked = scelte.frequenze[nome];
    casella.addEventListener('change', () => {
      const nuove = { ...scelte.frequenze, [nome]: casella.checked };
      if (!FREQUENZE.some((altra) => nuove[altra])) {
        casella.checked = true;
        return;
      }
      scelte.frequenze = nuove;
      storico.salvaFrequenze(nuove);
      ricalcola();
    });
  }

  // le parole con le doppie: spuntata, restano; tolta, spariscono
  const casellaDoppie = document.getElementById('includi-doppie');
  casellaDoppie.checked = scelte.doppie;
  casellaDoppie.addEventListener('change', () => {
    scelte.doppie = casellaDoppie.checked;
    storico.salvaDoppie(scelte.doppie);
    ricalcola();
  });

  // includere o escludere le voci con ciascun digramma e trigramma
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
    ricalcola();
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
    // la partita pesca solo tra le voci ammesse delle liste scelte, unite in una sola (con le quote di sostantivi, verbi...)
    suGioca({ ...scelte, lista: unisciListe(listeScelte(), opzioniFiltro(), listeDelTipo()) });
  });
  document.getElementById('pulsante-storico').addEventListener('click', suStorico);
  // cambiando "Chi gioca" cambiano le partite da cui si ricava l'abilità
  document.getElementById('scelta-bambino').addEventListener('change', aggiornaAbilita);
  aggiornaAbilita();
  aggiorna();
  return { aggiornaAbilita };
}
