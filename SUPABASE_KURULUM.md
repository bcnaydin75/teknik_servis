# Supabase Native API — Kurulum

cPanel PHP yerine Next.js + Supabase kullanmak için:

## 1. Supabase projesi

1. [supabase.com](https://supabase.com) → Yeni proje
2. **SQL Editor** → `supabase/migrations/001_initial_schema.sql` içeriğini yapıştır → Run
3. **Storage** → Bucket oluştur: `logos` (public veya signed URL — public daha kolay)

## 2. Ortam değişkenleri

Vercel (ve yerel `.env.local`):

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role (GİZLİ)
SESSION_SECRET=rastgele-uzun-bir-string
SUPABASE_STORAGE_BUCKET=logos

# Artık cPanel'e ihtiyaç yok — proxy devre dışı kalır:
# NEXT_PUBLIC_API_URL satırını silebilir veya bırakabilirsiniz
NEXT_PUBLIC_TENANT_SLUG=bcnaydin75
```

`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` tanımlıysa `/api/*` istekleri **doğrudan Next.js** üzerinden Supabase'e gider.

## 3. İlk admin

Yerelde:

```bash
node scripts/create-admin.mjs bcnaydin75 Sifren123
```

Veya SQL Editor:

```sql
-- bcrypt hash'i create-admin.mjs ile üretin
INSERT INTO admin_users (username, password_hash, role, tenant_id)
VALUES ('bcnaydin75', '$2a$10$...', 'admin', NULL);
UPDATE admin_users SET tenant_id = id WHERE username = 'bcnaydin75';
INSERT INTO shop_settings (tenant_id, firma_adi) 
SELECT id, 'Teknik Servis' FROM admin_users WHERE username = 'bcnaydin75';
```

## 4. MySQL verisi taşıma (opsiyonel)

cPanel phpMyAdmin → Export (SQL veya CSV). Tablolar:

- `admin_users`, `customers`, `repairs`, `inventory`, `transactions`, `shop_settings`, ...

PostgreSQL'e manuel veya script ile aktarın. `password_hash` (bcrypt) aynen çalışır.

## 5. Deploy

```bash
git push
```

Vercel env'leri kaydedin → Redeploy.

Test:

- `GET /api/ping.php` → `{"ok":true,"api":"native",...}`
- Admin login → `/admin/login`

## Notlar

- Oturum: `ts_session` HTTP-only cookie (PHP session yerine JWT)
- Logo: Supabase Storage `logos/{tenant_id}/logo.png`
- Personel aynı `tenant_id` ile paylaşımlı veri görür
- cPanel PHP tamamen opsiyonel — env'leri kaldırınca proxy'e düşmez (native her zaman öncelikli)
