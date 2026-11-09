#!/usr/bin/env python3
"""Trasforma i quattro documenti Word delle parole in liste/parole.json.

Uso:
    python3 strumenti/converti_liste.py "<cartella con i .docx>" [liste/parole.json] [morph-it_048.txt]

Legge (nella cartella indicata):
    Bisillabe Selezione - frequenza e digrammi.docx
    Trisillabe Selezione 10000 - frequenza e digrammi.docx
    Quadrisillabe Selezione 10000 - frequenza e digrammi.docx
    Pentasillabe Selezione 10000 - frequenza e digrammi.docx

Le liste sono raggruppate per numero di sillabe: "Bisillabe" > "Facili", "Con gruppi"...
Ogni categoria diventa una lista { "alta": [...], "bassa": [...], "doppie": [...], "classi": {...} }:
    alta / bassa  le parole di alta e bassa frequenza
    doppie        le parole (già in alta o bassa) che hanno le doppie
    classi        le parole che non sono sostantivi: "verbi", "aggettivi", "altro"
Le classi si ricavano dal vocabolario Morph-it (terzo argomento, file morph-it_048.txt, latin-1):
nomi propri e sostantivi -> sostantivi; verbi -> verbi; aggettivi -> aggettivi; il resto -> altro.
Senza il file Morph-it le classi non vengono scritte.
"proporzioni" dà, per ogni numero di sillabe, la quota di sostantivi, verbi, aggettivi e altro
presente nelle liste: il gioco la rispetta quando pesca le parole.
La divisione "con/senza digrammi" dei documenti non serve: i digrammi li riconosce il gioco.
La sezione "Da verificare" dei documenti non entra nel gioco.

Maiuscole: i nomi propri elencati in strumenti/nomi_propri.txt restano con l'iniziale
maiuscola, tutte le altre parole diventano minuscole.
Le parole in strumenti/parole_escluse.txt vengono tolte.
Solo libreria standard di Python.
"""
import collections
import json
import re
import sys
import zipfile
from pathlib import Path

QUI = Path(__file__).resolve().parent

DOCUMENTI = {
    'Bisillabe': 'Bisillabe Selezione - frequenza e digrammi.docx',
    'Trisillabe': 'Trisillabe Selezione 10000 - frequenza e digrammi.docx',
    'Quadrisillabe': 'Quadrisillabe Selezione 10000 - frequenza e digrammi.docx',
    'Pentasillabe': 'Pentasillabe Selezione 10000 - frequenza e digrammi.docx',
}

# nome nel documento -> nome nel gioco (nell'ordine in cui compaiono nel menu)
CATEGORIE = {
    'Facili': 'Facili',
    'Con gruppi': 'Con gruppi',
    'Cons ponte': 'Consonante ponte',
    'Gruppi + con ponte': 'Gruppi + ponte',
    'Dittonghi': 'Dittonghi e iati',
    'Dittonghi + gruppi': 'Dittonghi e iati + gruppi',
    'Dittonghi + ponte': 'Dittonghi e iati + ponte',
    'Dittonghi + gruppi + ponte': 'Dittonghi e iati + gruppi + ponte',
}


def paragrafi(percorso):
    xml = zipfile.ZipFile(percorso).read('word/document.xml').decode('utf-8')
    for p in re.findall(r'<w:p[ >].*?</w:p>', xml, flags=re.S):
        stile = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        testo = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))
        yield (stile.group(1) if stile else ''), testo


def leggi_documento(percorso):
    """Restituisce {(categoria, frequenza, doppie_si_no): [parole]} (esclusa la sezione 'Da verificare')."""
    voci = {}
    percorso_titoli = []
    corrente = None
    for stile, testo in paragrafi(percorso):
        m = re.match(r'^(.*?) \((\d+)\)\s*$', testo)
        if m and (stile.startswith('Heading') or m.group(1) in ('Senza doppie', 'Con doppie')):
            livello = {'Heading1': 0, 'Heading2': 1, 'Heading3': 2}.get(stile, 3)
            percorso_titoli = percorso_titoli[:livello] + [m.group(1)]
            corrente = None
            if percorso_titoli[0] in CATEGORIE and livello == 3:
                chiave = (percorso_titoli[0], percorso_titoli[1], percorso_titoli[3] == 'Con doppie')
                corrente = voci.setdefault(chiave, [])
        elif corrente is not None and testo.strip() and stile == '':
            corrente.extend(testo.split())
    return voci


def leggi_elenco(percorso):
    return [r.strip() for r in percorso.read_text(encoding='utf-8').splitlines()
            if r.strip() and not r.startswith('#')]


VERBI = {'VER', 'AUX', 'MOD', 'CAU', 'ASP'}


def leggi_morphit(percorso):
    """{forma: insieme delle categorie}, per esempio {'casa': {'NOUN'}, 'canta': {'VER'}}."""
    categorie = collections.defaultdict(set)
    with open(percorso, encoding='latin-1') as f:
        for riga in f:
            parti = riga.rstrip('\n').split('\t')
            if len(parti) == 3:
                categorie[parti[0]].add(parti[2].split(':')[0].split('-')[0])
    return categorie


def classe(parola, categorie, nomi_propri):
    if parola.lower() in nomi_propri:
        return 'sostantivi'
    tipi = categorie.get(parola.lower(), set()) | categorie.get(parola, set())
    # se una forma può essere più cose, vince il sostantivo, poi il verbo, poi l'aggettivo
    if tipi & {'NPR', 'NOUN'}:
        return 'sostantivi'
    if tipi & VERBI:
        return 'verbi'
    if 'ADJ' in tipi:
        return 'aggettivi'
    return 'altro'


def scrivi_json(percorso, dati):
    """Una riga per ogni lista, così il file resta leggibile e piccolo."""
    righe = ['{']
    for chiave in ('versione', 'stato', 'nota'):
        righe.append(f' {json.dumps(chiave)}: {json.dumps(dati[chiave], ensure_ascii=False)},')
    righe.append(f' "proporzioni": {json.dumps(dati["proporzioni"], ensure_ascii=False)},')
    righe.append(' "liste": {')
    gruppi = list(dati['liste'].items())
    for g, (gruppo, categorie) in enumerate(gruppi):
        righe.append(f'  {json.dumps(gruppo, ensure_ascii=False)}: {{')
        voci = list(categorie.items())
        for i, (nome, lista) in enumerate(voci):
            virgola = ',' if i < len(voci) - 1 else ''
            righe.append(f'   {json.dumps(nome, ensure_ascii=False)}: '
                         f'{json.dumps(lista, ensure_ascii=False, separators=(",", ":"))}{virgola}')
        righe.append('  }' + (',' if g < len(gruppi) - 1 else ''))
    righe += [' }', '}']
    percorso.write_text('\n'.join(righe) + '\n', encoding='utf-8')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cartella = Path(sys.argv[1])
    uscita = Path(sys.argv[2]) if len(sys.argv) > 2 else QUI.parent / 'liste' / 'parole.json'
    nomi_propri = {n.lower(): n for n in leggi_elenco(QUI / 'nomi_propri.txt')}
    escluse = {p.lower() for p in leggi_elenco(QUI / 'parole_escluse.txt')}
    categorie_morphit = leggi_morphit(sys.argv[3]) if len(sys.argv) > 3 else None

    def sistema(parola):
        minuscola = parola.lower()
        if minuscola in escluse:
            return None
        return nomi_propri.get(minuscola, minuscola)

    liste = {}
    proporzioni = {}
    totale = 0
    for lunghezza, nome_file in DOCUMENTI.items():
        voci = leggi_documento(cartella / nome_file)
        liste[lunghezza] = {}
        conteggio_classi = collections.Counter()
        for numero, (nome_doc, nome_gioco) in enumerate(CATEGORIE.items(), start=1):
            alta, bassa, doppie = [], [], []
            visti = set()
            for (categoria, frequenza, con_doppie), parole in voci.items():
                if categoria != nome_doc:
                    continue
                destinazione = alta if frequenza == 'Alta frequenza' else bassa
                for parola in parole:
                    sistemata = sistema(parola)
                    if sistemata is None or sistemata.lower() in visti:
                        continue
                    visti.add(sistemata.lower())
                    destinazione.append(sistemata)
                    if con_doppie:
                        doppie.append(sistemata)
            totale += len(alta) + len(bassa)
            lista = {
                'alta': sorted(alta, key=str.lower),
                'bassa': sorted(bassa, key=str.lower),
                'doppie': sorted(doppie, key=str.lower),
            }
            if categorie_morphit is not None:
                per_classe = {'verbi': [], 'aggettivi': [], 'altro': []}
                for parola in lista['alta'] + lista['bassa']:
                    tipo = classe(parola, categorie_morphit, nomi_propri)
                    conteggio_classi[tipo] += 1
                    if tipo != 'sostantivi':
                        per_classe[tipo].append(parola)
                lista['classi'] = per_classe
            liste[lunghezza][nome_gioco] = lista
        if categorie_morphit is not None:
            somma = sum(conteggio_classi.values())
            proporzioni[lunghezza] = {c: round(conteggio_classi[c] / somma, 3)
                                      for c in ('sostantivi', 'verbi', 'aggettivi', 'altro')}

    dati = {
        'versione': '1',
        'stato': 'selezione-10000',
        'nota': 'Liste generate da strumenti/converti_liste.py. alta/bassa = frequenza; doppie = parole con le doppie; classi = verbi, aggettivi, altro (il resto sono sostantivi).',
        'proporzioni': proporzioni,
        'liste': liste,
    }
    scrivi_json(uscita, dati)
    print(f'{sum(len(c) for c in liste.values())} liste, {totale} parole -> {uscita}')
    for lunghezza, quote in proporzioni.items():
        print(' ', lunghezza, {c: f'{100 * v:.0f}%' for c, v in quote.items()})


if __name__ == '__main__':
    main()
