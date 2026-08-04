/** Supabase PostgreSQL tablo adları (Türkçe) */
export const Tables = {
  yoneticiKullanicilar: "yonetici_kullanicilar",
  dukkanAyarlari: "dukkan_ayarlari",
  musteriler: "musteriler",
  tamirKayitlari: "tamir_kayitlari",
  tedarikciler: "tedarikciler",
  stok: "stok",
  tedarikciIslemleri: "tedarikci_islemleri",
  finansIslemleri: "finans_islemleri",
  garantiler: "garantiler",
  posSatislar: "pos_satislar",
  posSatisKalemleri: "pos_satis_kalemleri",
  cariIslemleri: "cari_islemleri",
} as const;

export type TableName = (typeof Tables)[keyof typeof Tables];
