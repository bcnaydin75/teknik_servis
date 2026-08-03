-- Çok dükkanlı model: platform geliştirici (superadmin) + bağımsız dükkan adminleri
-- Supabase SQL Editor'de bir kez çalıştırın.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

-- bcnaydin75 = platform geliştirici, dükkan verisiyle ilişkili değil
UPDATE admin_users
SET
  is_superadmin = TRUE,
  tenant_id = NULL,
  role = 'admin'
WHERE username ILIKE 'bcnaydin75';

-- Geliştirici hesabına bağlı dükkan ayarlarını kaldır (varsa)
DELETE FROM shop_settings
WHERE tenant_id IN (
  SELECT id FROM admin_users WHERE username ILIKE 'bcnaydin75'
);

-- Mevcut dükkan adminleri: tenant_id kendi id'si olmalı (dükkan sahibi)
UPDATE admin_users u
SET tenant_id = u.id
WHERE
  COALESCE(u.is_superadmin, FALSE) = FALSE
  AND u.role = 'admin'
  AND u.tenant_id IS NULL;

-- Dükkan adminleri için shop_settings yoksa oluştur
INSERT INTO shop_settings (tenant_id, firma_adi)
SELECT u.id, COALESCE(u.ad_soyad, u.username)
FROM admin_users u
WHERE
  COALESCE(u.is_superadmin, FALSE) = FALSE
  AND u.role = 'admin'
  AND u.tenant_id = u.id
ON CONFLICT (tenant_id) DO NOTHING;
