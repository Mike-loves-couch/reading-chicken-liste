<?php
declare(strict_types=1);

namespace ReadingChicken;

use DateTimeImmutable;
use DateTimeZone;

final class Tempo
{
    // i momenti si salvano in UTC, nel formato DATETIME di MySQL
    public static function sql(DateTimeImmutable $momento): string
    {
        return $momento->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }
}
