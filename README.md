# Teknik Servis Takip Sistemi

Çok dükkanlı (multi-tenant) teknik servis yönetim ve müşteri takip uygulaması.

- **Frontend / API:** Next.js 16 (App Router) + Route Handlers  
- **Veritabanı:** Supabase (PostgreSQL)  
- **Deploy:** Vercel (önerilen)  
- **Diller:** TR, EN, ES, IT, RU  

Repo: [github.com/bcnaydin75/teknik_servis](https://github.com/bcnaydin75/teknik_servis)

---

## Ne yapar?

| Alan | Açıklama |
|------|----------|
| Müşteri sayfası (`/`) | Takip kodu ile cihaz durumu, parçalar, (isteğe bağlı) ücret |
| Yönetim paneli (`/admin`) | Tamir kayıtları, stok, tedarikçi, POS, cari, finans, ayarlar |
| Fiş / QR | 80mm termal fiş + QR → müşteri sorgulama linki |
| PWA | Ana ekrana ekleme (müşteri ve yönetim için ayrı manifest) |

---

## Mimari

```
Tarayıcı
  → Vercel (Next.js)
      → /api/*  →  Native Supabase API (src/lib/server/*)
      → Supabase PostgreSQL + Storage (logo)
```

Eski cPanel PHP backend kaldırılmıştır. Ortam değişkenlerinde `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` varsa native API devreye girer.

Önemli dosyalar:

| Yol | Rol |
|-----|-----|
| `src/app/api/[...path]/route.ts` | API giriş noktası |
| `src/lib/server/native-api.ts` | Endpoint → handler eşlemesi |
| `src/lib/server/db-tables.ts` | Türkçe tablo adları |
| `src/lib/server/tenant-context.ts` | Dükkan / superadmin kapsamı |
| `supabase/migrations/` | Şema |

---

## Kullanıcı rolleri

| Rol | Kim | Yetki özeti |
|-----|-----|-------------|
| **Geliştirici** (`is_superadmin`) | Platform sahibi | Tüm dükkanlar, dükkan yöneticisi oluşturma; kendi “firma profili” yok |
| **Admin** | Dükkan sahibi / personel | Tam dükkan yetkisi (ayar, personel, stok, tamir…) |
| **Teknisyen** | Personel | Tamir işlemleri; maliyet görmez |
| **Kasa** | Personel | POS, finans, cari |

Her dükkan `tenant_id` ile izole edilir. Takip kodları dükkan öneki ile üretilir (ör. `BPH-26-001`).

---

## Müşteri sayfası (`/`)

1. Üst rozet: **Teknik Servis Takip Sistemi** (sabit sistem adı).  
2. Varsa dükkan adı, telefon, adres ayrıca gösterilir.  
3. Takip kodu ile sorgu (`/api/repair-status.php`).  
4. **Ücret detayı:** Ayarlarda “Gizle” seçiliyse ücret kutusu hiç gösterilmez; yalnızca durum / parçalar görünür.  
5. URL: `/?takip_kodu=BPH-26-001` veya `?kod=` otomatik sorgulanır.  
6. PWA: `public/manifest.webmanifest` → `start_url: "/"`.

---

## Yönetim paneli (`/admin`)

Giriş: `/admin/login` — oturum çerezi + middleware koruması.

### Panel (Dashboard)

- Aktif tamir listesi, durum filtreleri, arama  
- Yeni cihaz / düzenle, arşivle, WhatsApp, fiş yazdır  
- Teslimde garanti seçenekleri  

### Arşiv

- Arşivlenmiş kayıtlar; geri yükle / kalıcı sil  

### Hızlı Satış (POS)

- Stoktan sepete ekleme, adet, nakit / kart / veresiye  
- Veresiyede müşteri seçimi → cari borç  

### Stok

- Parça adı, maliyet, satış, adet, tedarikçi  
- **Tedarikçi seçilip stok eklenince / adet artınca:** `adet × maliyet` otomatik tedarikçi borcu  

### Tedarikçiler

- Tedarikçi kartı, borç / ödeme hareketleri, kalan borç  

### Kasa / Finans

- Gelir–gider özeti ve hareketler  

### Cari

- Müşteri bakiyeleri, borç / ödeme  

### Ayarlar

- Firma profili (ad, tel, adres, logo)  
- Takip kodu öneki (örnek format)  
- Müşteri sayfasında ücret detayı: Göster / Gizle  
- Personel ekleme (rol)  
- Dil, tema (açık / koyu)  
- Şifre değiştir  

### Fiş (`/admin/receipt/[kod]`)

- 80mm termal önizleme + yazdır  
- Üstte **firma adı** + **telefon**, sonra cihaz bilgileri, takip kodu, QR  

PWA yönetim: `public/admin-manifest.webmanifest` → `start_url: "/admin/login"`, kısa ad **Yönetim**.

---

## Veritabanı (Türkçe tablolar)

Migration’lar: `supabase/migrations/`

| Tablo | İçerik |
|-------|--------|
| `yonetici_kullanicilar` | Kullanıcılar, roller, tenant |
| `dukkan_ayarlari` | Firma, logo, ücret gösterimi, takip öneki |
| `musteriler` | Müşteriler, cari, risk |
| `tamir_kayitlari` | Tamir / takip kodu |
| `stok` | Envanter |
| `tedarikciler` / `tedarikci_islemleri` | Tedarikçi cari |
| `finans_islemleri` | Kasa |
| `garantiler` | Parça garantileri |
| `pos_satislar` / `pos_satis_kalemleri` | POS |
| `cari_islemleri` | Müşteri cari |

Yeni kurulumda `001` → `004` sırayla çalıştırın. Mevcut İngilizce tablolar için `004_turkce_tablo_adlari.sql` rename yapar.

---

## Ortam değişkenleri

`.env.example` referans alın. Vercel / `.env.local`:

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `SUPABASE_URL` | Evet | Proje URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Evet | Sunucu tarafı (gizli) |
| `SESSION_SECRET` | Evet | Oturum imzalama |
| `SUPABASE_STORAGE_BUCKET` | Hayır | Logo bucket (varsayılan `logos`) |
| `NEXT_PUBLIC_APP_URL` | Hayır | Takip / QR link kökü |
| `NEXT_PUBLIC_TENANT_SLUG` | Hayır | Public ayarlar için **dükkan admin** kullanıcı adı (geliştirici değil) |

```bash
npm install
cp .env.example .env.local
# .env.local doldur
npm run dev
```

Üretim: `npm run build` → Vercel’de `main` branch deploy.

---

## PWA ikonları

Kaynak: `public/brand-logo.png`

```bash
node scripts/make-pwa-icons.mjs
```

Çıktı: `public/icons/*`, `apple-touch-icon.png`, `favicon.png`, `src/app/icon.png`.  
Ana ekran kısayolu değişince eski kısayolu silip yeniden ekleyin (cache).

---

## API özeti (native)

İstekler tarayıcıdan `/api/*.php` path’leriyle gelir (geriye uyumluluk); Next handler işler:

- `auth.php` — giriş / çıkış / me  
- `repair-status.php` — müşteri takip  
- `get_devices.php`, `add_device.php`, `update_device.php`, `delete_device.php`  
- `dashboard_stats.php`  
- `inventory.php`, `suppliers.php`, `finance.php`  
- `pos.php`, `cari.php`  
- `settings.php`, `public_settings.php`  
- `check_customer.php`, `update_customer.php`  

---

## Tipik iş akışı

1. Geliştirici → Ayarlar → dükkan admini oluşturur (firma adı + kullanıcı).  
2. Dükkan admini giriş yapar → firma profili, takip öneki, logo.  
3. Stok + tedarikçi tanımlar (borç otomatik).  
4. Yeni cihaz kaydı → takip kodu + fiş / WhatsApp.  
5. Müşteri kod veya QR ile durumu görür.  
6. Teslim → isteğe bağlı garanti; POS ile parça satışı.

---

## Sorun giderme

| Belirti | Kontrol |
|---------|---------|
| API 503 | `SUPABASE_*` ve `SESSION_SECRET` Vercel’de tanımlı mı? |
| Müşteri “kayıt yok” | Kod doğru mu? Migration 004 uygulandı mı? |
| Ücret kutusu hâlâ görünüyor | Dükkan ayarında Gizle + deploy; yanıtta `ucret_detayi_goster: false` |
| Fişte “TEKNİK SERVİS” | Firma adı / telefon ayarlarda dolu mu? |
| Eski PWA ikonu | Kısayolu sil, yeniden “Ana ekrana ekle” |

---

## Lisans / not

Özel proje. Production sırları (service role, session secret) asla commit edilmez.
