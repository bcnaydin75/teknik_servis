-- İlk admin: bcnaydin75 / Bcnaydin75!
-- Supabase SQL Editor'de bir kez çalıştırın.

INSERT INTO admin_users (username, password_hash, role, aktif, must_change_password)
VALUES (
  'bcnaydin75',
  '$2b$10$avUzwBwu.lEU7P1biyeqEedihdw6yGn8u6HV1hdkF/BRYYIw0C7Yy',
  'admin',
  TRUE,
  FALSE
)
ON CONFLICT (username) DO NOTHING;

UPDATE admin_users
SET tenant_id = id
WHERE username = 'bcnaydin75' AND tenant_id IS NULL;

INSERT INTO shop_settings (tenant_id, firma_adi)
SELECT id, 'Teknik Servis'
FROM admin_users
WHERE username = 'bcnaydin75'
ON CONFLICT (tenant_id) DO NOTHING;
