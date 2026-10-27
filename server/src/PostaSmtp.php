<?php
declare(strict_types=1);

namespace ReadingChicken;

use PHPMailer\PHPMailer\PHPMailer;

// Email di solo testo inviate dalla casella del dominio. 'sicurezza': 'ssl' (porta 465),
// 'tls' (porta 587) o '' (nessuna, solo in sviluppo con Mailpit).
final class PostaSmtp implements Posta
{
    public function __construct(private array $config)
    {
    }

    public function invia(string $destinatario, string $oggetto, string $testo): void
    {
        $posta = new PHPMailer(true);
        $posta->isSMTP();
        $posta->Host = $this->config['host'];
        $posta->Port = (int) $this->config['porta'];
        $posta->SMTPSecure = $this->config['sicurezza'];
        $posta->SMTPAutoTLS = $this->config['sicurezza'] !== '';
        $posta->SMTPAuth = $this->config['utente'] !== '';
        $posta->Username = $this->config['utente'];
        $posta->Password = $this->config['password'];
        $posta->CharSet = PHPMailer::CHARSET_UTF8;
        $posta->setFrom($this->config['mittente'], $this->config['nome_mittente']);
        $posta->addAddress($destinatario);
        $posta->Subject = $oggetto;
        $posta->Body = $testo;
        $posta->send();
    }
}
