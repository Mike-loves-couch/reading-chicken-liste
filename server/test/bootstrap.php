<?php
declare(strict_types=1);

use ReadingChicken\Test\TestConDatabase;

require dirname(__DIR__) . '/src/avvio.php';

spl_autoload_register(function (string $classe): void {
    $prefisso = 'ReadingChicken\\Test\\';
    if (str_starts_with($classe, $prefisso)) {
        require __DIR__ . '/' . substr($classe, strlen($prefisso)) . '.php';
    }
});

// Il database di test riparte ogni volta dallo schema attuale.
$db = TestConDatabase::pdo();
$db->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach ($db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $tabella) {
    $db->exec("DROP TABLE `$tabella`");
}
$db->exec('SET FOREIGN_KEY_CHECKS = 1');
foreach (preg_split('/;\s*$/m', (string) file_get_contents(dirname(__DIR__) . '/schema.sql')) as $istruzione) {
    $istruzione = trim((string) preg_replace('/^--.*$/m', '', $istruzione));
    if ($istruzione !== '') {
        $db->exec($istruzione);
    }
}
