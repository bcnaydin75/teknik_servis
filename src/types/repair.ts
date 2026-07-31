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
  beklemede: "bg-slate-100 text-slate-700 ring-slate-200",
  inceleniyor: "bg-amber-50 text-amber-800 ring-amber-200",
  parca_bekliyor: "bg-orange-50 text-orange-800 ring-orange-200",
  tamirde: "bg-blue-50 text-blue-800 ring-blue-200",
  hazir: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  teslim_edildi: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};
