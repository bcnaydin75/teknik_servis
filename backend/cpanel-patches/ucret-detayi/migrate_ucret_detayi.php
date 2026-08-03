<?php
/**
 * Tek seferlik veritabanı güncellemesi.
 * cPanel File Manager → public_html/api/ içine yükleyin.
 * Tarayıcıdan açın: https://SIZIN-DOMAIN/api/migrate_ucret_detayi.php
 * "success":true görünce dosyayı silin.
 * Ardından schema_guard.php ve settings.php yamalarını uygulayın (KURULUM.md).
 */

require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

$result = $conn->query("SHOW COLUMNS FROM shop_settings LIKE 'ucret_detayi_goster'");
if ($result && $result->num_rows > 0) {
    echo json_encode([
        'success' => true,
        'message' => 'ucret_detayi_goster sütunu zaten mevcut.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$ok = $conn->query(
    "ALTER TABLE shop_settings ADD COLUMN ucret_detayi_goster TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Müşteri takip: ücret detayı'"
);

echo json_encode([
    'success' => (bool) $ok,
    'message' => $ok
        ? 'Sütun eklendi. Şimdi KURULUM.md içindeki PHP yamalarını uygulayın.'
        : ('Hata: ' . $conn->error),
], JSON_UNESCAPED_UNICODE);
