-- Şifre sıfırlama: bcnaydin75 / Bcnaydin75!
-- Supabase SQL Editor'de çalıştır (doğrulanmış bcrypt hash).

UPDATE admin_users
SET password_hash = '$2b$10$gWHO7dnX1VvhZUPycsX.9u5kHNkoN4B.SgPq/EayqzaPiRGtIhCi2',
    aktif = TRUE,
    role = 'admin'
WHERE username ILIKE 'bcnaydin75';

-- Satır yoksa:
INSERT INTO admin_users (username, password_hash, role, aktif)
SELECT 'bcnaydin75',
  '$2b$10$gWHO7dnX1VvhZUPycsX.9u5kHNkoN4B.SgPq/EayqzaPiRGtIhCi2',
  'admin',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username ILIKE 'bcnaydin75');

UPDATE admin_users SET tenant_id = id WHERE username ILIKE 'bcnaydin75' AND tenant_id IS NULL;

INSERT INTO shop_settings (tenant_id, firma_adi)
SELECT id, 'Teknik Servis' FROM admin_users WHERE username ILIKE 'bcnaydin75'
ON CONFLICT (tenant_id) DO NOTHING;
