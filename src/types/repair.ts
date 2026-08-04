export type DeviceStatus =
  | "beklemede"
  | "inceleniyor"
  | "parca_bekliyor"
  | "tamirde"
  | "hazir"
  | "teslim_edildi";

export interface RepairData {
  takip_kodu: string;
  musteri_adi: string;
  cihaz_modeli: string;
  cihaz_durumu: DeviceStatus;
  degisen_parcalar: string[];
  parca_ucreti: number;
  iscilik_ucreti: number;
  toplam_ucret: number;
  aciklama: string | null;
  olusturma_tarihi: string;
  guncelleme_tarihi: string;
  /** Kayıtın dükkan ayarına göre — false ise ücret kutusu hiç gösterilmez */
  ucret_detayi_goster?: boolean;
  firma_adi?: string | null;
  firma_telefon?: string | null;
}

export interface RepairApiResponse {
  success: boolean;
  message?: string;
  data?: RepairData;
}

export const STATUS_LABELS: Record<DeviceStatus, string> = {
  beklemede: "Beklemede",
  inceleniyor: "İnceleniyor",
  parca_bekliyor: "Parça Bekliyor",
  tamirde: "Tamirde",
  hazir: "Teslime Hazır",
  teslim_edildi: "Teslim Edildi",
};

export const STATUS_COLORS: Record<DeviceStatus, string> = {
  beklemede:
    "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-500",
  inceleniyor:
    "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/50",
  parca_bekliyor:
    "bg-orange-100 text-orange-900 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-400/50",
  tamirde:
    "bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/50",
  hazir:
    "bg-violet-100 text-violet-900 ring-violet-300 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/50",
  teslim_edildi:
    "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-400/50",
};
