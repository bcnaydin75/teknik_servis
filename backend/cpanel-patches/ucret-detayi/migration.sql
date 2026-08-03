-- shop_settings tablosuna ücret detayı ayarı (phpMyAdmin'de çalıştırın)
ALTER TABLE shop_settings
  ADD COLUMN ucret_detayi_goster TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'Müşteri takip sayfasında ücret detayı: 1=göster, 0=gizle';
