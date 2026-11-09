import { mescola } from './casuale.js';

export const FILE_LISTE = { sillabe: 'liste/sillabe.json', parole: 'liste/parole.json' };
export const QUANTITA = [5, 10, 20, 50];

// Accetta i due formati di Mike:
// - sillabe: { "<nome lista>": [...] }
// - parole:  { versione, stato, nota, liste: { "<nome lista>": [...] } }
// Una lista può anche avere le voci divise per frequenza: { "alta": [...], "bassa": [...], "doppie": [...] }
// e le classi grammaticali delle voci che non sono sostantivi: "classi": { "verbi": [...], "aggettivi": [...], "altro": [...] }.
// Le liste con un semplice elenco non hanno informazioni sulla frequenza e compaiono sempre.
// Le liste possono stare dentro un gruppo (per esempio il numero di sillabe):
// { "Bisillabe": { "Facili": [...], "Con gruppi": [...] } }; "proporzioni" a livello di file dà,
// per ogni gruppo, la quota di sostantivi, verbi, aggettivi e altro da rispettare quando si pescano le parole.
export function normalizzaListe(dati) {
  const haListe = dati && typeof dati.liste === 'object' && dati.liste !== null && !Array.isArray(dati.liste);
  const sorgente = haListe ? dati.liste : dati;
  if (!sorgente || typeof sorgente !== 'object' || Array.isArray(sorgente)) {
    throw new Error('Formato liste non valido');
  }
  const proporzioni = haListe && typeof dati.proporzioni === 'object' ? dati.proporzioni : null;
  const liste = [];
  for (const [nome, valori] of Object.entries(sorgente)) {
    const lista = creaLista(nome, valori);
    if (lista) {
      liste.push(lista);
    } else if (typeof valori === 'object' && valori !== null && !Array.isArray(valori)) {
      // un gruppo: le sue liste si mostrano sotto il suo nome
      for (const [sotto, contenuto] of Object.entries(valori)) {
        const interna = creaLista(`${nome} - ${sotto}`, contenuto);
        if (!interna) continue;
        interna.gruppo = nome;
        interna.etichetta = sotto;
        const quote = proporzioni?.[nome];
        if (quote && typeof quote === 'object') interna.proporzioni = quote;
        liste.push(interna);
      }
    }
  }
  return liste;
}

function creaLista(nome, valori) {
  if (Array.isArray(valori)) return { nome, elementi: pulisci(valori) };
  if (!haFrequenze(valori)) return null;
  const alta = pulisci(Array.isArray(valori.alta) ? valori.alta : []);
  const inAlta = new Set(alta.map((voce) => voce.toLocaleLowerCase('it-IT')));
  // una voce presente in entrambe resta solo tra le alte
  const bassa = pulisci(Array.isArray(valori.bassa) ? valori.bassa : [])
    .filter((voce) => !inAlta.has(voce.toLocaleLowerCase('it-IT')));
  const lista = { nome, elementi: [...alta, ...bassa], frequenze: { alta, bassa } };
  // "doppie": le voci (già in alta o bassa) che hanno le doppie, da togliere se non si vogliono
  if (Array.isArray(valori.doppie)) lista.doppie = pulisci(valori.doppie);
  if (typeof valori.classi === 'object' && valori.classi !== null) {
    lista.classi = {};
    for (const classe of CLASSI) if (Array.isArray(valori.classi[classe])) lista.classi[classe] = pulisci(valori.classi[classe]);
  }
  return lista;
}

function haFrequenze(valori) {
  return typeof valori === 'object' && valori !== null && (Array.isArray(valori.alta) || Array.isArray(valori.bassa));
}

// I numeri davanti ai nomi ("01 - Facili") servono solo a ordinare i file: non si mostrano.
export function senzaNumero(nome) {
  return nome.replace(/^\d+\s*[-–.]\s*/, '');
}

export const CLASSI = ['sostantivi', 'verbi', 'aggettivi', 'altro'];
const classiDelleListe = new WeakMap();

// La classe grammaticale di una voce della lista. Le voci non elencate in "classi" sono sostantivi.
export function classeDi(lista, voce) {
  if (!lista.classi) return null;
  let mappa = classiDelleListe.get(lista);
  if (!mappa) {
    mappa = new Map();
    for (const [classe, voci] of Object.entries(lista.classi)) {
      for (const v of voci) mappa.set(v.toLocaleLowerCase('it-IT'), classe);
    }
    classiDelleListe.set(lista, mappa);
  }
  return mappa.get(voce.toLocaleLowerCase('it-IT')) ?? 'sostantivi';
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
// Per ogni gruppo: il nome del gruppo se sono scelte tutte le sue liste ("Bisillabe"), altrimenti
// il gruppo con le liste scelte ("Bisillabe: Facili, Con gruppi"). tutte = tutte le liste dello stesso tipo.
export function nomeDelleListe(liste, tutte = liste) {
  const parti = [];
  const perGruppo = new Map();
  for (const lista of liste) {
    if (!lista.gruppo) {
      parti.push(senzaNumero(lista.nome));
    } else if (!perGruppo.has(lista.gruppo)) {
      const scelte = liste.filter((altra) => altra.gruppo === lista.gruppo);
      const delGruppo = tutte.filter((altra) => altra.gruppo === lista.gruppo);
      parti.push(scelte.length === delGruppo.length
        ? lista.gruppo
        : `${lista.gruppo}: ${scelte.map((altra) => altra.etichetta).join(', ')}`);
      perGruppo.set(lista.gruppo, true);
    }
  }
  const intero = parti.join(' + ');
  if (parti.length === 1 || intero.length <= 110) return intero;
  return `${parti[0]} + altre ${parti.length - 1} liste`;
}

export function unisciListe(liste, opzioni, tutte = liste) {
  const elementi = elementiDelleListe(liste, opzioni);
  return { nome: nomeDelleListe(liste, tutte), elementi, bilancio: bilancioDelleListe(liste, elementi) };
}

// Le quote di sostantivi, verbi, aggettivi e altro da rispettare pescando tra le voci scelte: ogni gruppo
// (per esempio "Bisillabe") porta le sue, e valgono in proporzione a quante voci ha tra quelle scelte.
// Senza classi o proporzioni (o con voci di cui non si sa la classe) si pesca a caso, null.
export function bilancioDelleListe(liste, elementi) {
  const classi = {};
  const gruppoDi = new Map();
  const proporzioni = new Map();
  for (const lista of liste) {
    if (!lista.classi || !lista.proporzioni || !lista.gruppo) continue;
    proporzioni.set(lista.gruppo, lista.proporzioni);
    for (const voce of lista.elementi) {
      const chiave = voce.toLocaleLowerCase('it-IT');
      if (classi[chiave]) continue;
      classi[chiave] = classeDi(lista, voce);
      gruppoDi.set(chiave, lista.gruppo);
    }
  }
  if (elementi.length === 0 || elementi.some((voce) => !classi[voce.toLocaleLowerCase('it-IT')])) return null;
  const perGruppo = new Map();
  for (const voce of elementi) {
    const gruppo = gruppoDi.get(voce.toLocaleLowerCase('it-IT'));
    perGruppo.set(gruppo, (perGruppo.get(gruppo) ?? 0) + 1);
  }
  const obiettivo = Object.fromEntries(CLASSI.map((classe) => [classe, 0]));
  for (const [gruppo, quante] of perGruppo) {
    for (const classe of CLASSI) obiettivo[classe] += (quante / elementi.length) * (Number(proporzioni.get(gruppo)[classe]) || 0);
  }
  return { classi, obiettivo };
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

export function pescaParole(elementi, quante, casuale, bilancio = null) {
  if (!bilancio) return mescola(casuale, elementi).slice(0, quante);
  const perClasse = Object.fromEntries(CLASSI.map((classe) => [classe, []]));
  for (const voce of elementi) perClasse[bilancio.classi[voce.toLocaleLowerCase('it-IT')] ?? 'altro'].push(voce);
  const capacita = Object.fromEntries(CLASSI.map((classe) => [classe, perClasse[classe].length]));
  const quote = ripartisci(Math.min(quante, elementi.length), capacita, bilancio.obiettivo, casuale);
  const scelte = CLASSI.flatMap((classe) => mescola(casuale, perClasse[classe]).slice(0, quote[classe]));
  return mescola(casuale, scelte);
}

// Divide n posti tra le classi in proporzione ai pesi, senza superare quante voci ha ciascuna classe:
// se una ne ha poche, i posti che avanzano vanno alle altre. I posti che restano dopo la parte intera
// vanno a sorte, con più probabilità alle classi con il decimale più alto (così, su tante partite,
// le percentuali tornano esatte anche per le classi piccole); senza "casuale" vanno ai decimali più alti.
export function ripartisci(n, capacita, pesi, casuale = null) {
  const quote = Object.fromEntries(CLASSI.map((classe) => [classe, 0]));
  let restano = n;
  let aperte = CLASSI.filter((classe) => capacita[classe] > 0);
  while (restano > 0 && aperte.length > 0) {
    let somma = aperte.reduce((totale, classe) => totale + (pesi[classe] || 0), 0);
    const peso = (classe) => (somma > 0 ? pesi[classe] || 0 : 1);
    if (somma === 0) somma = aperte.length;
    const ideali = aperte.map((classe) => (restano * peso(classe)) / somma);
    let assegnati = 0;
    aperte.forEach((classe, i) => {
      const intero = Math.min(Math.floor(ideali[i]), capacita[classe] - quote[classe]);
      quote[classe] += intero;
      assegnati += intero;
    });
    restano -= assegnati;
    let candidate = aperte
      .map((classe, i) => ({ classe, decimali: ideali[i] - Math.floor(ideali[i]) }))
      .filter(({ classe }) => quote[classe] < capacita[classe]);
    while (restano > 0 && candidate.length > 0) {
      let scelta = candidate.reduce((meglio, c) => (c.decimali > meglio.decimali ? c : meglio), candidate[0]);
      if (casuale) {
        const totale = candidate.reduce((somma, c) => somma + c.decimali, 0);
        if (totale > 0) {
          let punto = casuale() * totale;
          scelta = candidate.find((c) => (punto -= c.decimali) < 0) ?? scelta;
        }
      }
      quote[scelta.classe] += 1;
      restano -= 1;
      candidate = candidate.filter((c) => c !== scelta);
    }
    aperte = aperte.filter((classe) => quote[classe] < capacita[classe]);
  }
  return quote;
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
