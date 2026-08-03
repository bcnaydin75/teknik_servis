-- Şifre sıfırlama: bcnaydin75 / Bcnaydin75!
-- Platform geliştirici — dükkan verisiyle ilişkili değil.

UPDATE admin_users
SET password_hash = '$2b$10$gWHO7dnX1VvhZUPycsX.9u5kHNkoN4B.SgPq/EayqzaPiRGtIhCi2',
    aktif = TRUE,
    role = 'admin',
    is_superadmin = TRUE,
    tenant_id = NULL
WHERE username ILIKE 'bcnaydin75';

INSERT INTO admin_users (username, password_hash, role, aktif, is_superadmin)
SELECT 'bcnaydin75',
  '$2b$10$gWHO7dnX1VvhZUPycsX.9u5kHNkoN4B.SgPq/EayqzaPiRGtIhCi2',
  'admin',
  TRUE,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username ILIKE 'bcnaydin75');

DELETE FROM shop_settings
WHERE tenant_id IN (SELECT id FROM admin_users WHERE username ILIKE 'bcnaydin75');
