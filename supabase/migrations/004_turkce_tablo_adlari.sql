-- Tablo adlarını Türkçeleştir (mevcut İngilizce şema kuruluysa bir kez çalıştırın)
-- Zaten Türkçe ise bu bloklar atlanır.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sale_items') THEN
    ALTER TABLE pos_sale_items RENAME TO pos_satis_kalemleri;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sales') THEN
    ALTER TABLE pos_sales RENAME TO pos_satislar;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_transactions') THEN
    ALTER TABLE customer_transactions RENAME TO cari_islemleri;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'warranties') THEN
    ALTER TABLE warranties RENAME TO garantiler;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    ALTER TABLE transactions RENAME TO finans_islemleri;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_transactions') THEN
    ALTER TABLE supplier_transactions RENAME TO tedarikci_islemleri;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    ALTER TABLE inventory RENAME TO stok;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    ALTER TABLE suppliers RENAME TO tedarikciler;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'repairs') THEN
    ALTER TABLE repairs RENAME TO tamir_kayitlari;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    ALTER TABLE customers RENAME TO musteriler;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shop_settings') THEN
    ALTER TABLE shop_settings RENAME TO dukkan_ayarlari;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
    ALTER TABLE admin_users RENAME TO yonetici_kullanicilar;
  END IF;
END $$;

-- takip_oneki migration (003) İngilizce tablo adıyla çalıştırıldıysa
ALTER TABLE dukkan_ayarlari
  ADD COLUMN IF NOT EXISTS takip_oneki VARCHAR(6) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_dukkan_ayarlari_takip_oneki ON dukkan_ayarlari (takip_oneki);
