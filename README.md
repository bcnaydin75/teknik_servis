# Teknik Servis — Frontend (Next.js)

Vercel'e deploy edilecek Next.js arayüzü. PHP API ayrı sunucuda (Laragon veya hosting) çalışmalıdır.

## Vercel kurulum

1. [github.com/bcnaydin75/teknik_servis](https://github.com/bcnaydin75/teknik_servis) reposunu Vercel'e import et
2. Framework: **Next.js** (otomatik algılanır)
3. **Environment Variable** ekle:
   - `NEXT_PUBLIC_API_URL` = PHP backend kök URL'i (ör. `https://api.example.com/backend`)
4. Deploy

## Yerel geliştirme

```bash
npm install
npm run dev
```

`.env.local` oluştur (`.env.example` dosyasına bak).

## Not

- `/api/*` istekleri `NEXT_PUBLIC_API_URL` üzerinden PHP backend'e proxy edilir
- Backend bu repoda yok; Laragon'daki `backend/` klasöründe kalır
