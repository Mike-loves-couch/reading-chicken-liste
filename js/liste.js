import { mescola } from './casuale.js';

export const FILE_LISTE = { sillabe: 'liste/sillabe.json', parole: 'liste/parole.json' };
export const QUANTITA = [5, 10, 20, 50];

// Accetta i due formati di Mike:
// - sillabe: { "<nome lista>": [...] }
// - parole:  { versione, stato, nota, liste: { "<nome lista>": [...] } }
// Una lista può anche avere le voci divise per frequenza: { "alta": [...], "bassa": [...], "doppie": [...] }.
// Le liste con un semplice elenco non hanno informazioni sulla frequenza e compaiono sempre.
export function normalizzaListe(dati) {
  const haListe = dati && typeof dati.liste === 'object' && dati.liste !== null && !Array.isArray(dati.liste);
  const sorgente = haListe ? dati.liste : dati;
  if (!sorgente || typeof sorgente !== 'object' || Array.isArray(sorgente)) {
    throw new Error('Formato liste non valido');
  }
  const liste = [];
  for (const [nome, valori] of Object.entries(sorgente)) {
    if (Array.isArray(valori)) {
      liste.push({ nome, elementi: pulisci(valori) });
    } else if (haFrequenze(valori)) {
      const alta = pulisci(Array.isArray(valori.alta) ? valori.alta : []);
      const inAlta = new Set(alta.map((voce) => voce.toLocaleLowerCase('it-IT')));
      // una voce presente in entrambe resta solo tra le alte
      const bassa = pulisci(Array.isArray(valori.bassa) ? valori.bassa : [])
        .filter((voce) => !inAlta.has(voce.toLocaleLowerCase('it-IT')));
      const lista = { nome, elementi: [...alta, ...bassa], frequenze: { alta, bassa } };
      // "doppie": le voci (già in alta o bassa) che hanno le doppie, da togliere se non si vogliono
      if (Array.isArray(valori.doppie)) lista.doppie = pulisci(valori.doppie);
      liste.push(lista);
    }
  }
  return liste;
}

function haFrequenze(valori) {
  return typeof valori === 'object' && valori !== null && (Array.isArray(valori.alta) || Array.isArray(valori.bassa));
}

export const FREQUENZE = ['alta', 'bassa'];
export const TUTTE_LE_FREQUENZE = { alta: true, bassa: true };

// Le voci della lista con le frequenze scelte. Senza informazioni sulla frequenza restano tutte.
export function filtraFrequenze(lista, ammesse = TUTTE_LE_FREQUENZE) {
  if (!lista.frequenze) return lista.elementi;
  return FREQUENZE.filter((nome) => ammesse[nome] !== false).flatMap((nome) => lista.frequenze[nome]);
}

// Toglie da voci (le voci della lista) quelle con le doppie, se non si vogliono.
// Le liste senza l'elenco "doppie" restano come sono.
export function filtraDoppie(lista, voci, vuoleDoppie = true) {
  if (vuoleDoppie || !lista.doppie) return voci;
  const conDoppie = new Set(lista.doppie.map((voce) => voce.toLocaleLowerCase('it-IT')));
  return voci.filter((voce) => !conDoppie.has(voce.toLocaleLowerCase('it-IT')));
}

// Le voci di più liste insieme, senza ripetizioni, già filtrate per frequenza, doppie e digrammi/trigrammi.
export function elementiDelleListe(liste, { frequenze = TUTTE_LE_FREQUENZE, doppie = true, gruppi = TUTTI_I_GRUPPI } = {}) {
  const voci = liste.flatMap((lista) => filtraDoppie(lista, filtraFrequenze(lista, frequenze), doppie));
  return pulisci(filtraGruppi(voci, gruppi));
}

// Più liste scelte diventano una sola, con un nome che le riassume (il server accetta fino a 120 caratteri).
export function nomeDelleListe(liste) {
  const nomi = liste.map((lista) => lista.nome);
  const intero = nomi.join(' + ');
  if (nomi.length === 1 || intero.length <= 110) return intero;
  return `${nomi[0]} + altre ${nomi.length - 1} liste`;
}

export function unisciListe(liste, opzioni) {
  return { nome: nomeDelleListe(liste), elementi: elementiDelleListe(liste, opzioni) };
}

export function pulisci(valori) {
  const visti = new Set();
  const risultato = [];
  for (const valore of valori) {
    if (typeof valore !== 'string') continue;
    const testo = valore.trim();
    if (testo === '') continue;
    const chiave = testo.toLocaleLowerCase('it-IT');
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    risultato.push(testo);
  }
  return risultato;
}

export function opzioniQuantita(disponibili) {
  if (disponibili === 0) return [];
  if (disponibili < QUANTITA[0]) {
    return [{ valore: disponibili, etichetta: `Tutte (${disponibili})`, attiva: true }];
  }
  return QUANTITA.map((quantita) => ({ valore: quantita, etichetta: String(quantita), attiva: quantita <= disponibili }));
}

// Ogni digramma e trigramma si può includere o escludere da solo.
export const DIGRAMMI = ['ci', 'gi', 'ch', 'gh', 'sc', 'gn', 'gl'];
export const TRIGRAMMI = ['sci', 'gli'];

// Come si riconosce ogni gruppo nel testo (minuscolo). ci/gi contano davanti a a/o/u
// (bacio, giusto), sc davanti a e/i (sceso). "gli" è digramma (gl) quando non è seguito
// da a/e/o/u (figli, agli) e trigramma quando lo è (figlio, foglia).
const TRIGRAMMI_REGEX = { sci: /sci/g, gli: /gli(?=[aeou])/g };
const DIGRAMMI_REGEX = { ci: /ci[aou]/, gi: /gi[aou]/, ch: /ch/, gh: /gh/, sc: /sc[ei]/, gn: /gn/, gl: /gli(?![aeou])/ };

export const TUTTI_I_GRUPPI = Object.fromEntries([...DIGRAMMI, ...TRIGRAMMI].map((nome) => [nome, true]));

// I gruppi presenti in una voce. I trigrammi si tolgono prima di cercare i digrammi,
// così "scia" conta solo come trigramma.
export function gruppiPresenti(testo) {
  let minuscolo = testo.toLocaleLowerCase('it-IT');
  const presenti = [];
  for (const nome of TRIGRAMMI) {
    if (TRIGRAMMI_REGEX[nome].test(minuscolo)) presenti.push(nome);
    TRIGRAMMI_REGEX[nome].lastIndex = 0;
    minuscolo = minuscolo.replaceAll(TRIGRAMMI_REGEX[nome], '-');
  }
  for (const nome of DIGRAMMI) {
    if (DIGRAMMI_REGEX[nome].test(minuscolo)) presenti.push(nome);
  }
  return presenti;
}

export function haTrigramma(testo) {
  return gruppiPresenti(testo).some((nome) => TRIGRAMMI.includes(nome));
}

export function haDigramma(testo) {
  return gruppiPresenti(testo).some((nome) => DIGRAMMI.includes(nome));
}

// Tiene le voci i cui gruppi sono tutti ammessi. Una voce con più gruppi (es. "sciogli")
// resta solo se sono ammessi tutti. Un gruppo non indicato conta come ammesso.
export function filtraGruppi(elementi, ammessi = TUTTI_I_GRUPPI) {
  return elementi.filter((voce) => gruppiPresenti(voce).every((nome) => ammessi[nome] !== false));
}

// In minuscolo i nomi propri (nelle liste hanno l'iniziale maiuscola e il resto minuscolo: Roma, Gianni)
// tengono l'iniziale maiuscola. Le sillabe (PA, A) e il resto delle parole diventano tutte minuscole.
export function formatta(testo, maiuscolo) {
  if (maiuscolo) return testo.toLocaleUpperCase('it-IT');
  const minuscolo = testo.toLocaleLowerCase('it-IT');
  const iniziale = testo.charAt(0);
  const nomeProprio = testo.length > 1
    && iniziale !== iniziale.toLocaleLowerCase('it-IT')
    && testo.slice(1) === minuscolo.slice(1);
  return nomeProprio ? iniziale + minuscolo.slice(1) : minuscolo;
}

export function pescaParole(elementi, quante, casuale) {
  return mescola(casuale, elementi).slice(0, quante);
}

// no-cache: il browser ricontrolla il file, così le modifiche di Mike si vedono subito.
const fetchPredefinito = (url) => fetch(url, { cache: 'no-cache' });

async function caricaTipo(url, fetchFn) {
  const risposta = await fetchFn(url);
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
  return normalizzaListe(await risposta.json());
}

// Non lancia mai: un tipo che non si carica riporta l'errore, l'altro resta giocabile.
export async function caricaTutto(fetchFn = fetchPredefinito) {
  const risultato = {};
  for (const [tipo, url] of Object.entries(FILE_LISTE)) {
    try {
      risultato[tipo] = { url, liste: await caricaTipo(url, fetchFn) };
    } catch (errore) {
      risultato[tipo] = { url, errore: errore.message };
    }
  }
  return risultato;
}
