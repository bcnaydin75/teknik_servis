-- Çok dükkanlı model: platform geliştirici (superadmin) + bağımsız dükkan adminleri
-- Supabase SQL Editor'de bir kez çalıştırın.

ALTER TABLE yonetici_kullanicilar
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

-- bcnaydin75 = platform geliştirici, dükkan verisiyle ilişkili değil
UPDATE yonetici_kullanicilar
SET
  is_superadmin = TRUE,
  tenant_id = NULL,
  role = 'admin'
WHERE username ILIKE 'bcnaydin75';

-- Geliştirici hesabına bağlı dükkan ayarlarını kaldır (varsa)
DELETE FROM dukkan_ayarlari
WHERE tenant_id IN (
  SELECT id FROM yonetici_kullanicilar WHERE username ILIKE 'bcnaydin75'
);

-- Mevcut dükkan adminleri: tenant_id kendi id'si olmalı (dükkan sahibi)
UPDATE yonetici_kullanicilar u
SET tenant_id = u.id
WHERE
  COALESCE(u.is_superadmin, FALSE) = FALSE
  AND u.role = 'admin'
  AND u.tenant_id IS NULL;

-- Dükkan adminleri için dukkan_ayarlari yoksa oluştur
INSERT INTO dukkan_ayarlari (tenant_id, firma_adi)
SELECT u.id, COALESCE(u.ad_soyad, u.username)
FROM yonetici_kullanicilar u
WHERE
  COALESCE(u.is_superadmin, FALSE) = FALSE
  AND u.role = 'admin'
  AND u.tenant_id = u.id
ON CONFLICT (tenant_id) DO NOTHING;
