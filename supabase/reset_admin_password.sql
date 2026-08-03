-- Şifre sıfırlama: bcnaydin75 / Bcnaydin75!
-- Önceki seed'deki hash hatalıydı — bunu SQL Editor'de çalıştır.

UPDATE admin_users
SET password_hash = '$2b$10$8d0T8UENFHOyd3xDictI2O.sdnaegKssdqSrHgPjgBn5b2OHZr7xi',
    aktif = TRUE
WHERE username = 'bcnaydin75';

-- Kullanıcı yoksa seed_admin.sql dosyasını çalıştır.
