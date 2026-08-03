<?php
/**
 * Eksik tablo/sütunları otomatik oluşturur (migration_task5)
 */

function ensureSchema(mysqli $conn): void
{
    $conn->query("
        CREATE TABLE IF NOT EXISTS shop_settings (
            id INT UNSIGNED PRIMARY KEY DEFAULT 1,
            firma_adi VARCHAR(200) NOT NULL DEFAULT 'Teknik Servis',
            adres TEXT DEFAULT NULL,
            telefon VARCHAR(30) DEFAULT NULL,
            email VARCHAR(150) DEFAULT NULL,
            logo_path VARCHAR(500) DEFAULT NULL,
            guncelleme_tarihi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $conn->query("INSERT IGNORE INTO shop_settings (id, firma_adi) VALUES (1, 'Teknik Servis')");

    $conn->query("
        CREATE TABLE IF NOT EXISTS customer_transactions (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            customer_id INT UNSIGNED NOT NULL,
            type ENUM('borc', 'odeme') NOT NULL,
            amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            description VARCHAR(255) DEFAULT NULL,
            pos_sale_id INT UNSIGNED DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_customer_id (customer_id),
            CONSTRAINT fk_cari_customer
                FOREIGN KEY (customer_id) REFERENCES customers(id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS pos_sales (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            customer_id INT UNSIGNED DEFAULT NULL,
            payment_type ENUM('nakit', 'kart', 'veresiye') NOT NULL DEFAULT 'nakit',
            total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            description VARCHAR(255) DEFAULT NULL,
            created_by INT UNSIGNED DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_customer_id (customer_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS pos_sale_items (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            sale_id INT UNSIGNED NOT NULL,
            inventory_id INT UNSIGNED NOT NULL,
            part_name VARCHAR(150) NOT NULL,
            quantity INT UNSIGNED NOT NULL DEFAULT 1,
            unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            INDEX idx_sale_id (sale_id),
            CONSTRAINT fk_pos_item_sale
                FOREIGN KEY (sale_id) REFERENCES pos_sales(id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    ensureColumn($conn, 'customers', 'cari_bakiye', "DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Pozitif = müşteri borçlu'");
    ensureColumn($conn, 'repairs', 'imei_no', "VARCHAR(20) DEFAULT NULL COMMENT 'IMEI numarası'");
    ensureColumn($conn, 'repairs', 'cihaz_sifresi', "VARCHAR(100) DEFAULT NULL COMMENT 'Ekran kilidi / şifre'");
    ensureColumn($conn, 'admin_users', 'role', "ENUM('admin','teknisyen','kasa') NOT NULL DEFAULT 'admin'");
    ensureColumn($conn, 'admin_users', 'ad_soyad', "VARCHAR(150) DEFAULT NULL");
    ensureColumn($conn, 'admin_users', 'aktif', "TINYINT(1) NOT NULL DEFAULT 1");
    ensureColumn($conn, 'admin_users', 'must_change_password', "TINYINT(1) NOT NULL DEFAULT 0");
    ensureColumn($conn, 'repairs', 'arsivlendi', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Arşivlenmiş kayıt'");
    ensureColumn($conn, 'repairs', 'arsiv_tarihi', "DATETIME DEFAULT NULL COMMENT 'Arşivlenme zamanı'");
    ensureColumn($conn, 'shop_settings', 'default_locale', "VARCHAR(5) NOT NULL DEFAULT 'tr' COMMENT 'Site dili: tr, en, es, it'");
    ensureColumn($conn, 'shop_settings', 'ucret_detayi_goster', "TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Müşteri takip: ücret detayı'");

    $uploadsDir = dirname(__DIR__) . '/uploads';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }
}

function ensureColumn(mysqli $conn, string $table, string $column, string $definition): void
{
    $dbResult = $conn->query('SELECT DATABASE() AS db');
    $dbRow = $dbResult->fetch_assoc();
    $dbName = $dbRow['db'] ?? '';

    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->bind_param('sss', $dbName, $table, $column);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ((int) ($result['cnt'] ?? 0) === 0) {
        if (!$conn->query("ALTER TABLE `$table` ADD COLUMN `$column` $definition")) {
            error_log("ensureColumn failed ($table.$column): " . $conn->error);
        }
    }
}

function getShopSettings(mysqli $conn): array
{
    ensureSchema($conn);
    $result = $conn->query('SELECT * FROM shop_settings WHERE id = 1 LIMIT 1');
    $row = $result->fetch_assoc();

    $logoUrl = null;
    if (!empty($row['logo_path'])) {
        $filePath = dirname(__DIR__) . '/' . $row['logo_path'];
        $v = file_exists($filePath) ? filemtime($filePath) : time();
        $logoUrl = '/api/public_settings.php?action=logo&v=' . $v;
    }

    return [
        'firma_adi' => $row['firma_adi'] ?? 'Teknik Servis',
        'adres' => $row['adres'],
        'telefon' => $row['telefon'],
        'email' => $row['email'],
        'logo_url' => $logoUrl,
        'logo_path' => $row['logo_path'] ?? null,
        'default_locale' => normalizeLocale($row['default_locale'] ?? 'tr'),
        'ucret_detayi_goster' => (int) ($row['ucret_detayi_goster'] ?? 1) === 1,
    ];
}

function normalizeLocale(?string $locale): string
{
    $allowed = ['tr', 'en', 'es', 'it', 'ru'];
    $locale = strtolower(trim((string) $locale));
    return in_array($locale, $allowed, true) ? $locale : 'tr';
}
