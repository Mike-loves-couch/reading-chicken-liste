-- Schema di Reading Chicken (MySQL 8 / MariaDB 10.6+). Da importare in un database vuoto.
-- Eliminare un utente elimina in cascata tutto ciò che gli appartiene.

CREATE TABLE utenti (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  ruolo ENUM('logopedista', 'famiglia') NOT NULL,
  nome VARCHAR(80) NULL,
  logopedista_id INT UNSIGNED NULL,
  creato_il DATETIME NOT NULL,
  UNIQUE KEY utenti_email (email),
  CONSTRAINT fk_utenti_logopedista FOREIGN KEY (logopedista_id) REFERENCES utenti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bambini (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  famiglia_id INT UNSIGNED NOT NULL,
  nome VARCHAR(40) NOT NULL,
  archiviato TINYINT(1) NOT NULL DEFAULT 0,
  creato_il DATETIME NOT NULL,
  CONSTRAINT fk_bambini_famiglia FOREIGN KEY (famiglia_id) REFERENCES utenti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE accessi (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utente_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  scade_il DATETIME NOT NULL,
  usato_il DATETIME NULL,
  UNIQUE KEY accessi_token (token_hash),
  CONSTRAINT fk_accessi_utente FOREIGN KEY (utente_id) REFERENCES utenti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE richieste_accesso (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  creato_il DATETIME NOT NULL,
  KEY richieste_email (email, creato_il),
  KEY richieste_ip (ip, creato_il)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessioni (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utente_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  scade_il DATETIME NOT NULL,
  creato_il DATETIME NOT NULL,
  UNIQUE KEY sessioni_token (token_hash),
  CONSTRAINT fk_sessioni_utente FOREIGN KEY (utente_id) REFERENCES utenti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE partite (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bambino_id INT UNSIGNED NOT NULL,
  id_client CHAR(36) NOT NULL,
  giocata_il DATETIME NOT NULL,
  tipo ENUM('sillabe', 'parole') NOT NULL,
  lista VARCHAR(120) NOT NULL,
  maiuscolo TINYINT(1) NOT NULL,
  quantita SMALLINT UNSIGNED NOT NULL,
  durata_secondi INT UNSIGNED NULL,
  ricevuta_il DATETIME NOT NULL,
  UNIQUE KEY partite_id_client (id_client),
  KEY partite_bambino_data (bambino_id, giocata_il),
  CONSTRAINT fk_partite_bambino FOREIGN KEY (bambino_id) REFERENCES bambini (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parole_partita (
  partita_id INT UNSIGNED NOT NULL,
  posizione SMALLINT UNSIGNED NOT NULL,
  testo VARCHAR(60) NOT NULL,
  riprova SMALLINT UNSIGNED NOT NULL,
  secondi DECIMAL(6,1) NULL,
  PRIMARY KEY (partita_id, posizione),
  CONSTRAINT fk_parole_partita FOREIGN KEY (partita_id) REFERENCES partite (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
