import type { DeviceStatus } from "./repair";

export interface DeviceListItem {
  id: number;
  musteri_id: number;
  takip_kodu: string;
  musteri_adi: string;
  musteri_telefon: string | null;
  musteri_email: string | null;
  riskli_musteri: boolean;
  risk_notu: string | null;
  cihaz_modeli: string;
  cihaz_durumu: DeviceStatus;
  degisen_parcalar: string[];
  parca_ucreti: number;
  iscilik_ucreti: number;
  toplam_ucret: number;
  aciklama: string | null;
  imei_no: string | null;
  cihaz_sifresi: string | null;
  olusturma_tarihi: string;
  guncelleme_tarihi: string;
  arsivlendi?: boolean;
  arsiv_tarihi?: string | null;
}

export interface ArchivePeriod {
  year: number;
  month: number;
  label: string;
  count: number;
}

export interface AdminStats {
  toplam_cihaz: number;
  aktif_tamir: number;
  teslime_hazir: number;
}

export interface DashboardStats extends AdminStats {
  bekleyen_cihaz: number;
  bugunku_tamir: number;
  pos_cirosu_bugun: number;
  pos_satis_sayisi_bugun: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  message?: string;
  data?: DashboardStats;
}

export interface GetDevicesResponse {
  success: boolean;
  message?: string;
  data?: {
    stats: AdminStats;
    devices: DeviceListItem[];
    archive_periods?: ArchivePeriod[];
    total_archived?: number;
  };
}

export interface AddDevicePayload {
  ad_soyad: string;
  telefon?: string;
  email?: string;
  cihaz_modeli: string;
  aciklama?: string;
  imei_no?: string;
  cihaz_sifresi?: string;
}

export interface UpdateDevicePayload {
  id: number;
  cihaz_durumu: DeviceStatus;
  degisen_parcalar: string[];
  inventory_ids?: number[];
  parca_ucreti: number;
  iscilik_ucreti: number;
  indirim?: number;
  toplam_ucret?: number;
  aciklama?: string;
  imei_no?: string;
  cihaz_sifresi?: string;
  /** Teslimde: nakit | kart | veresiye | beklemede */
  odeme_sekli?: "nakit" | "kart" | "veresiye" | "beklemede";
  warranties?: { parca_adi: string; garanti_ay: number }[];
}

export interface WarrantyItem {
  id: number;
  parca_adi: string;
  garanti_ay: number;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  takip_kodu: string;
  cihaz_modeli: string;
}

export interface CustomerCheckData {
  id: number;
  ad_soyad: string;
  telefon: string | null;
  email: string | null;
  riskli_musteri: boolean;
  risk_notu: string | null;
  aktif_garantiler: WarrantyItem[];
}

export interface CustomerCheckResponse {
  success: boolean;
  message?: string;
  data?: CustomerCheckData | null;
}

export interface SupplierItem {
  id: number;
  firma_adi: string;
  telefon: string | null;
  email: string | null;
  adres: string | null;
  notlar: string | null;
  created_at: string;
  toplam_borc: number;
  toplam_odeme: number;
  kalan_borc: number;
}

export interface SupplierTransaction {
  id: number;
  supplier_id: number;
  firma_adi: string;
  type: "borc" | "odeme";
  amount: number;
  description: string | null;
  created_at: string;
}

export interface SuppliersResponse {
  success: boolean;
  message?: string;
  data?: {
    suppliers: SupplierItem[];
    transactions: SupplierTransaction[];
  };
}

export interface ApiMessageResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface InventoryItem {
  id: number;
  part_name: string;
  buy_price?: number;
  sell_price: number;
  stock_quantity: number;
  supplier_id: number | null;
  supplier_name: string | null;
  created_at: string;
}

export interface InventoryResponse {
  success: boolean;
  message?: string;
  data?: InventoryItem[];
}

export interface InventoryPayload {
  action?: "add" | "update";
  id?: number;
  part_name: string;
  buy_price: number;
  sell_price: number;
  stock_quantity: number;
  supplier_id?: number | null;
}

export type TransactionType = "income" | "expense";

export interface TransactionItem {
  id: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface FinanceSummary {
  total_income: number;
  total_expense: number;
  net_balance: number;
}

export interface FinanceResponse {
  success: boolean;
  message?: string;
  data?: {
    summary: FinanceSummary;
    transactions: TransactionItem[];
  };
}

export const DEVICE_STATUS_OPTIONS: { value: DeviceStatus; label: string }[] = [
  { value: "beklemede", label: "Beklemede" },
  { value: "inceleniyor", label: "İnceleniyor" },
  { value: "parca_bekliyor", label: "Parça Bekliyor" },
  { value: "tamirde", label: "Tamirde" },
  { value: "hazir", label: "Teslime Hazır" },
  { value: "teslim_edildi", label: "Teslim Edildi" },
];

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  income: "Gelir",
  expense: "Gider",
};
