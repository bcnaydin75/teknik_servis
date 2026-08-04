-- Dükkan bazlı takip kodu öneki (ör. APH-26-001)
ALTER TABLE dukkan_ayarlari
  ADD COLUMN IF NOT EXISTS takip_oneki VARCHAR(6) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_dukkan_ayarlari_takip_oneki ON dukkan_ayarlari (takip_oneki);
