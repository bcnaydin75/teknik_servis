-- İlk platform geliştirici: bcnaydin75 / Bcnaydin75!
-- Dükkan sahibi değildir; yalnızca dükkan adminleri oluşturur.
-- Supabase SQL Editor'de bir kez çalıştırın.

INSERT INTO yonetici_kullanicilar (username, password_hash, role, aktif, must_change_password, is_superadmin)
VALUES (
  'bcnaydin75',
  '$2b$10$gWHO7dnX1VvhZUPycsX.9u5kHNkoN4B.SgPq/EayqzaPiRGtIhCi2',
  'admin',
  TRUE,
  FALSE,
  TRUE
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  aktif = EXCLUDED.aktif,
  is_superadmin = TRUE,
  tenant_id = NULL;

UPDATE yonetici_kullanicilar
SET tenant_id = NULL, is_superadmin = TRUE
WHERE username ILIKE 'bcnaydin75';

DELETE FROM dukkan_ayarlari
WHERE tenant_id IN (SELECT id FROM yonetici_kullanicilar WHERE username ILIKE 'bcnaydin75');
