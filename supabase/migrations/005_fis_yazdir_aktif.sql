-- Kaydet sonrası fiş yazdırma (varsayılan: açık)
-- Tablo adı Türkçe veya eski İngilizce olabilir.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dukkan_ayarlari'
  ) THEN
    ALTER TABLE dukkan_ayarlari
      ADD COLUMN IF NOT EXISTS fis_yazdir_aktif BOOLEAN NOT NULL DEFAULT TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shop_settings'
  ) THEN
    ALTER TABLE shop_settings
      ADD COLUMN IF NOT EXISTS fis_yazdir_aktif BOOLEAN NOT NULL DEFAULT TRUE;
  ELSE
    RAISE EXCEPTION 'Ne dukkan_ayarlari ne shop_settings tablosu bulundu';
  END IF;
END $$;
