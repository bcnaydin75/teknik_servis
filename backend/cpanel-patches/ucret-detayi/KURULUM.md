# Ücret detayı ayarı — kurulum

SQL'i phpMyAdmin'de çalıştırdıysan veritabanı hazır.

## cPanel File Manager

`public_html/api/` klasöründe **şu 2 dosyayı** bu klasördekilerle değiştir:

```
backend/cpanel-patches/ucret-detayi/cpanel-api/schema_guard.php  →  public_html/api/schema_guard.php
backend/cpanel-patches/ucret-detayi/cpanel-api/settings.php      →  public_html/api/settings.php
```

Yedek al: eski dosyaları önce `schema_guard.php.bak` olarak kopyala.

## Test

Tarayıcıda aç:

```
https://SIZIN-CPANEL-DOMAIN/api/public_settings.php?action=profile
```

Yanıtta `"ucret_detayi_goster": true` görünmeli.

Admin → Ayarlar → Firma Profili → **Gizle (sadece parçalar)** → Kaydet → müşteri sayfasında fiyat kutusu kaybolmalı.
