-- Database separato per PHPUnit: i test lo svuotano a ogni esecuzione
CREATE DATABASE rc_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON rc_test.* TO 'rc'@'%';
