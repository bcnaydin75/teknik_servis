# Teknik Servis — Frontend (Next.js)

Vercel'de çalışan arayüz. **PHP API ve MySQL yalnızca cPanel'de** çalışır; Vercel veritabanına bağlanmaz.

## Mimari

```
Tarayıcı  →  Vercel (/api/* Route Handler proxy)  →  cPanel PHP API  →  MySQL
```

- Tüm `fetch` çağrıları `src/lib/api-config.ts` içindeki `apiUrl()` üzerinden gider
- Vercel `next.config.ts` rewrite ile `/api/*` isteklerini cPanel'e yönlendirir
- Bu repoda **Next.js API route veya MySQL bağlantısı yok**

## Vercel kurulum

1. [github.com/bcnaydin75/teknik_servis](https://github.com/bcnaydin75/teknik_servis) reposunu import et
2. **Settings → Environment Variables** ekle:

| Değişken | Değer |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `http://loyal-brown-emu.89-252-180-227.cpanel.site` |

**Önemli:** Değer mutlaka `http://` veya `https://` ile başlamalı. Tırnak veya sondaki `/` kullanma.

3. **Redeploy** (env değişince mutlaka yeniden deploy)

> cPanel'de SSL varsa `https://` kullanın. Tarayıcı HTTPS Vercel sitesinden HTTP API'ye doğrudan istek atamaz; proxy bu yüzden kullanılır.

## Yerel geliştirme

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

`.env.local` içinde Laragon backend adresi:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1/teknik_servis_projesi/backend
```

## cPanel PHP

API dosyaları cPanel `public_html` (veya alt klasör) içinde olmalı:

- `/api/auth.php`
- `/api/settings.php`
- vb.

502 hatası genelde `NEXT_PUBLIC_API_URL` eksik/yanlış veya cPanel PHP'nin kapalı olmasından kaynaklanır.

## Vercel deploy notu

- **Redeploy** eski deployment'ta aynı commit'i tekrar build eder (ör. `7801ebd`).
- Yeni kod için **Deployments** listesinde en güncel commit'i (`main` branch HEAD) seç veya Git push sonrası otomatik deploy'u bekle.
- Production commit: `main` branch — GitHub'daki son commit deploy edilmeli.
