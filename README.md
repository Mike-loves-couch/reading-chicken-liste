# Reading Chicken

Gioco da browser per bambini che esercitano la lettura di sillabe e parole italiane insieme a un genitore. Il pollo attraversa un labirinto, raccoglie le parole da leggere e il genitore segna se la lettura è corretta o da riprovare.

## Come giocare in locale

Dalla radice del repository:

```sh
python3 -m http.server 8000
```

poi apri http://127.0.0.1:8000/.

Aprire `index.html` con un doppio clic non funziona: i browser bloccano i moduli ES caricati da `file://`.

## Test

```sh
npm test
```

Serve Node 22. Nessuna dipendenza da installare.

## Le liste

Le liste sono in `liste/sillabe.json` e `liste/parole.json`. Formati accettati:

- sillabe: `{ "<nome>": [...] }`
- parole: `{ versione, stato, nota, liste: { "<nome>": [...] } }`

Alla lettura le liste vengono pulite in memoria: spazi tolti ai bordi, voci vuote e doppioni ignorati (senza distinguere maiuscole e minuscole). I file non vengono mai modificati.

## Storico

Lo storico delle partite è salvato solo nel browser (localStorage) di quel computer.

## Note sulle liste

- La lista 08 delle parole ha solo 2 parole (la 06 ne ha 11, la 04 e la 07 ne hanno 14): per questo le quantità 20 e 50 sono disabilitate.
- `lei` e `lui` nella lista 05 sono monosillabi.
- `grigio` è presente sia in "02 - Bisillabe - Con gruppi" sia in "06 - Bisillabe - Dittonghi e iati + gruppi".
- `UFO` è l'unica parola scritta in maiuscolo (il gioco la normalizza).

## Crediti

- Font: Andika (SIL OFL, vedi `fonts/OFL.txt`).
- Immagini e suoni: vedi `CREDITI.md` (tutti con licenza CC0).
- Mondi: nel menu si sceglie Fattoria, Dungeon o Spazio (la scelta viene ricordata).
  Ogni mondo è descritto in `js/temi.js` (piastrelle, personaggi, oggetti, uscita, colori) e
  in un blocco di colori in `css/style.css`; le regole del gioco sono le stesse.
