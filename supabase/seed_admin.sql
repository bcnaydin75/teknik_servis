-- İlk platform geliştirici: bcnaydin75 / Bcnaydin75!
-- Dükkan sahibi değildir; yalnızca dükkan adminleri oluşturur.
-- Supabase SQL Editor'de bir kez çalıştırın.

INSERT INTO admin_users (username, password_hash, role, aktif, must_change_password, is_superadmin)
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

UPDATE admin_users
SET tenant_id = NULL, is_superadmin = TRUE
WHERE username ILIKE 'bcnaydin75';

DELETE FROM shop_settings
WHERE tenant_id IN (SELECT id FROM admin_users WHERE username ILIKE 'bcnaydin75');
