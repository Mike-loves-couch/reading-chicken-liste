# Reading Chicken

Gioco da browser per bambini che esercitano la lettura di sillabe e parole italiane insieme a un genitore. Il pollo attraversa un labirinto, raccoglie le parole da leggere e il genitore segna se la lettura è corretta o da riprovare.

## Comandi

- Frecce: muovono il pollo.
- Con la parola a schermo il genitore segna **Corretta** (clic o tasto C) o **Riprova** (clic o tasto R).
- Altoparlante nella barra del gioco: accende e spegne i suoni.

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

## Server: accesso e risultati per il logopedista

Con il server, il logopedista invita le famiglie e crea i profili di chi gioca; genitori e logopedista entrano con un link via email, senza password. Il codice è in `server/` (PHP senza framework, MySQL), le pagine in `accedi/` e `michele/`.

Con l'accesso, nel menu del gioco compare "Chi gioca": a fine partita il risultato di quel profilo va al server (se manca la rete resta nel browser e parte alla prima occasione) e lo storico mostra le sue partite da qualsiasi computer. Nella pagina del logopedista, "Risultati" accanto a ogni profilo apre l'andamento, le parole più difficili e le partite parola per parola.

### Sviluppo in locale

Serve Docker.

```sh
docker compose up -d --wait
```

- gioco e API: http://localhost:8080/
- pagina del logopedista: http://localhost:8080/michele/ (account di prova `michele@esempio.it`)
- email inviate (link di accesso e inviti): http://localhost:8025/
- test del server: `docker compose exec web phpunit -c server/phpunit.xml`
- database da capo: `docker compose down -v && docker compose up -d --wait`

### Pubblicare sull'hosting

Servono PHP 8.2 o superiore (con PDO MySQL, OpenSSL e mbstring), MySQL o MariaDB, HTTPS, una casella email con SMTP, i file `.htaccess` (servono Apache o LiteSpeed: su altri server, per esempio nginx, la cartella del server va messa fuori dalla radice web) e un dominio.

1. Nel pannello dell'hosting: attiva HTTPS e il reindirizzamento da http a https; crea un database MySQL con il suo utente; crea la casella `accesso@<dominio>` e controlla che SPF e DKIM del dominio siano attivi.
2. In phpMyAdmin importa `server/schema.sql`, poi crea l'account del logopedista:
   `INSERT INTO utenti (email, ruolo, nome, creato_il) VALUES ('<email del logopedista>', 'logopedista', '<nome>', UTC_TIMESTAMP());`
3. Carica via FTP/SFTP nella radice web: `index.html`, `privacy.html`, `css/`, `js/`, `img/`, `audio/`, `fonts/`, `liste/`, `accedi/`, `michele/`, `api/`. Nel client FTP attiva la visualizzazione dei file nascosti: servono `api/.htaccess` e `server/.htaccess`.
4. Della cartella `server/` carica esattamente `src/`, `vendor/` e `.htaccess` (più `config.php` del passo 5):
   - se l'hosting ha una cartella fuori dalla radice web, mettila lì (`src/`, `vendor/`, `.htaccess`) e crea `api/percorso.php` con `<?php return '/percorso/completo/della/cartella/server';`;
   - altrimenti caricala come `server/` dentro la radice web: il suo `.htaccess` impedisce di aprirla dal browser.
5. Accanto a `src/` copia `config.esempio.php` in `config.php` e compila i dati del database e della casella.
6. Prova: apri `https://<dominio>/michele/`, chiedi il link con l'email del logopedista ed entra. Se l'email con il link non arriva, guarda `server/errori.log`: il link parte dopo la risposta, quindi gli errori SMTP compaiono solo lì. Controlla anche che `https://<dominio>/server/vendor/PHPMailer/LICENSE` risponda 403: se si apre, l'hosting ignora `.htaccess` e va spostata la cartella server fuori dalla radice web, come al punto 4.
7. Completa `privacy.html` prima di invitare le famiglie.

Gli errori del server finiscono in `server/errori.log`, che il browser non può aprire.

## Le liste

Le liste sono in `liste/sillabe.json` e `liste/parole.json`. Formati accettati:

- sillabe: `{ "<nome>": [...] }`
- parole: `{ versione, stato, nota, liste: { "<nome>": [...] } }`

Ogni lista può essere un semplice elenco `[...]` oppure avere le voci divise così: `{ "alta": [...], "bassa": [...], "doppie": [...] }`. `doppie` elenca le parole (già presenti in alta o bassa) che hanno le doppie. Se almeno una lista è fatta così, nel menu compare il riquadro "Frequenza e doppie": le caselle Alta e Bassa (almeno una resta sempre scelta) e "Includi le doppie". Le liste con un semplice elenco compaiono sempre. Nel menu si possono spuntare più liste insieme: le loro voci si uniscono senza ripetizioni.

Le liste possono stare dentro un gruppo, per esempio il numero di sillabe: `{ "Bisillabe": { "Facili": {...}, "Con gruppi": {...} } }`. Nel menu il gruppo compare con una casella "(tutte)" che sceglie in un colpo solo tutte le sue liste, e le liste stanno sotto, rientrate. I numeri davanti ai nomi ("01 - ...") non si mostrano.

Per rispettare le percentuali di sostantivi, verbi, aggettivi e altro, una lista può avere `"classi": { "verbi": [...], "aggettivi": [...], "altro": [...] }` (le voci non elencate sono sostantivi) e il file può avere `"proporzioni": { "Bisillabe": { "sostantivi": 0.5, "verbi": 0.3, "aggettivi": 0.1, "altro": 0.1 }, ... }`. Pescando le parole, il gioco dà a ogni classe la sua quota (a sorte sui decimali, così su tante partite le percentuali tornano), mescolando le quote dei gruppi scelti in proporzione a quante voci ha ciascun gruppo.

I nomi propri nelle liste hanno l'iniziale maiuscola e il resto minuscolo (Roma, Gianni): con le lettere minuscole il gioco li mostra con l'iniziale maiuscola, con il MAIUSCOLO tutto maiuscolo. Le altre parole sono scritte in minuscolo.

`liste/parole.json` si genera dai documenti Word con `python3 strumenti/converti_liste.py "<cartella dei .docx>" liste/parole.json "<morph-it_048.txt>"` (il terzo argomento, il vocabolario Morph-it, serve per le classi grammaticali). I nomi propri sono in `strumenti/nomi_propri.txt` e le parole da non usare in `strumenti/parole_escluse.txt`: si modificano a mano e si rilancia il comando.

Alla lettura le liste vengono pulite in memoria: spazi tolti ai bordi, voci vuote e doppioni ignorati (senza distinguere maiuscole e minuscole). I file non vengono mai modificati.

## Barre di abilità nel menu

A fianco di ogni lista (e di ogni gruppo, per esempio "Bisillabe") c'è una barra: la lunghezza dice quante parole diverse della lista sono già state lette (piena a 100, o a tutte le parole se la lista è più corta) e il colore dice la velocità, cioè il tempo mediano delle ultime 30 letture (verde-azzurro = veloce, arancione = lento; il valore è scritto accanto alla barra). I dati sono le partite di chi gioca: quelle del profilo scelto in "Chi gioca" (dal server) oppure quelle del browser. La categoria di ogni parola si ricava dal suo testo, quindi vale anche per le partite già giocate. Le soglie di velocità per numero di sillabe sono in `js/abilita.js` (`SOGLIE_VELOCITA`) e vanno tarate sui bambini.

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
