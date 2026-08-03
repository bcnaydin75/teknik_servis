-- İlk admin: bcnaydin75 / Bcnaydin75!
-- Supabase SQL Editor'de bir kez çalıştırın.

INSERT INTO admin_users (username, password_hash, role, aktif, must_change_password)
VALUES (
  'bcnaydin75',
  '$2b$10$gWHO7dnX1VvhZUPycsX.9u5kHNkoN4B.SgPq/EayqzaPiRGtIhCi2',
  'admin',
  TRUE,
  FALSE
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  aktif = EXCLUDED.aktif;

UPDATE admin_users
SET tenant_id = id
WHERE username = 'bcnaydin75' AND tenant_id IS NULL;

INSERT INTO shop_settings (tenant_id, firma_adi)
SELECT id, 'Teknik Servis'
FROM admin_users
WHERE username = 'bcnaydin75'
ON CONFLICT (tenant_id) DO NOTHING;
