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
