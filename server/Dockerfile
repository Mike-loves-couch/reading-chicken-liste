# PHP 8.3 + Apache come sugli hosting condivisi, con PDO MySQL, .htaccess attivi e PHPUnit per i test.
FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite \
    && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf
ADD --chmod=755 https://phar.phpunit.de/phpunit-11.5.57.phar /usr/local/bin/phpunit
