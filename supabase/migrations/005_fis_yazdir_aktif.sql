-- Kaydet sonrası fiş yazdırma (varsayılan: açık)
ALTER TABLE dukkan_ayarlari
  ADD COLUMN IF NOT EXISTS fis_yazdir_aktif BOOLEAN NOT NULL DEFAULT TRUE;
