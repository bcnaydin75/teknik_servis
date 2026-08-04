-- Teknik Servis — Supabase (PostgreSQL) şeması (Türkçe tablo adları)
-- Supabase SQL Editor'de veya CLI ile çalıştırın.

CREATE TYPE admin_role AS ENUM ('admin', 'teknisyen', 'kasa');
CREATE TYPE device_status AS ENUM (
  'beklemede', 'inceleniyor', 'parca_bekliyor', 'tamirde', 'hazir', 'teslim_edildi'
);
CREATE TYPE finance_tx_type AS ENUM ('income', 'expense');
CREATE TYPE cari_tx_type AS ENUM ('borc', 'odeme');
CREATE TYPE payment_type AS ENUM ('nakit', 'kart', 'veresiye');
CREATE TYPE supplier_tx_type AS ENUM ('borc', 'odeme');

CREATE TABLE yonetici_kullanicilar (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  ad_soyad VARCHAR(150),
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id BIGINT REFERENCES yonetici_kullanicilar (id) ON DELETE SET NULL,
  created_by BIGINT REFERENCES yonetici_kullanicilar (id) ON DELETE SET NULL,
  olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dukkan_ayarlari (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL UNIQUE REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  firma_adi VARCHAR(200) NOT NULL DEFAULT 'Teknik Servis',
  adres TEXT,
  telefon VARCHAR(30),
  email VARCHAR(150),
  logo_path VARCHAR(500),
  default_locale VARCHAR(5) NOT NULL DEFAULT 'tr',
  ucret_detayi_goster BOOLEAN NOT NULL DEFAULT TRUE,
  fis_yazdir_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  takip_oneki VARCHAR(6) UNIQUE,
  guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE musteriler (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  ad_soyad VARCHAR(200) NOT NULL,
  telefon VARCHAR(30),
  email VARCHAR(150),
  cari_bakiye DECIMAL(10, 2) NOT NULL DEFAULT 0,
  riskli_musteri BOOLEAN NOT NULL DEFAULT FALSE,
  risk_notu TEXT,
  olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_musteriler_tenant ON musteriler (tenant_id);
CREATE INDEX idx_musteriler_telefon ON musteriler (tenant_id, telefon);

CREATE TABLE tamir_kayitlari (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES musteriler (id) ON DELETE CASCADE,
  takip_kodu VARCHAR(50) NOT NULL,
  cihaz_modeli VARCHAR(200) NOT NULL,
  cihaz_durumu device_status NOT NULL DEFAULT 'beklemede',
  degisen_parcalar JSONB NOT NULL DEFAULT '[]'::jsonb,
  parca_ucreti DECIMAL(10, 2) NOT NULL DEFAULT 0,
  iscilik_ucreti DECIMAL(10, 2) NOT NULL DEFAULT 0,
  toplam_ucret DECIMAL(10, 2) NOT NULL DEFAULT 0,
  aciklama TEXT,
  imei_no VARCHAR(20),
  cihaz_sifresi VARCHAR(100),
  arsivlendi BOOLEAN NOT NULL DEFAULT FALSE,
  arsiv_tarihi TIMESTAMPTZ,
  olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, takip_kodu)
);

CREATE INDEX idx_tamir_kayitlari_tenant ON tamir_kayitlari (tenant_id);
CREATE INDEX idx_tamir_kayitlari_takip ON tamir_kayitlari (takip_kodu);
CREATE INDEX idx_tamir_kayitlari_arsiv ON tamir_kayitlari (tenant_id, arsivlendi, arsiv_tarihi);

CREATE TABLE tedarikciler (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  firma_adi VARCHAR(200) NOT NULL,
  telefon VARCHAR(30),
  email VARCHAR(150),
  adres TEXT,
  notlar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stok (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  part_name VARCHAR(150) NOT NULL,
  buy_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  supplier_id BIGINT REFERENCES tedarikciler (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tedarikci_islemleri (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  supplier_id BIGINT NOT NULL REFERENCES tedarikciler (id) ON DELETE CASCADE,
  type supplier_tx_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finans_islemleri (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  type finance_tx_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE garantiler (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES musteriler (id) ON DELETE CASCADE,
  repair_id BIGINT REFERENCES tamir_kayitlari (id) ON DELETE SET NULL,
  parca_adi VARCHAR(150) NOT NULL,
  garanti_ay INT NOT NULL,
  baslangic_tarihi DATE NOT NULL,
  bitis_tarihi DATE NOT NULL,
  takip_kodu VARCHAR(50),
  cihaz_modeli VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pos_satislar (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES musteriler (id) ON DELETE SET NULL,
  payment_type payment_type NOT NULL DEFAULT 'nakit',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description VARCHAR(255),
  created_by BIGINT REFERENCES yonetici_kullanicilar (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pos_satis_kalemleri (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES pos_satislar (id) ON DELETE CASCADE,
  inventory_id BIGINT NOT NULL REFERENCES stok (id) ON DELETE RESTRICT,
  part_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE cari_islemleri (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES yonetici_kullanicilar (id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES musteriler (id) ON DELETE CASCADE,
  type cari_tx_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description VARCHAR(255),
  pos_sale_id BIGINT REFERENCES pos_satislar (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- İlk admin: şifreyi scripts/create-admin.mjs ile oluşturun veya seed SQL kullanın.
