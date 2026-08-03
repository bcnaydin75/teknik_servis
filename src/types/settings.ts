export interface ShopSettings {
  firma_adi: string;
  adres: string | null;
  telefon: string | null;
  email: string | null;
  logo_url: string | null;
  default_locale?: string;
  /** Müşteri takip sayfasında ücret detayı kutusu (varsayılan: göster) */
  ucret_detayi_goster?: boolean;
}

export interface StaffMember {
  id: number;
  username: string;
  role: "admin" | "teknisyen" | "kasa";
  ad_soyad: string | null;
  aktif: boolean;
  olusturma_tarihi: string;
}

export interface PosItem {
  id: number;
  part_name: string;
  sell_price: number;
  stock_quantity: number;
}

export interface PosCartItem {
  inventory_id: number;
  quantity: number;
}

export interface CariCustomer {
  id: number;
  ad_soyad: string;
  telefon: string | null;
  email?: string | null;
  cari_bakiye: number;
  olusturma_tarihi?: string;
}

export interface CariTransaction {
  id: number;
  type: "borc" | "odeme";
  amount: number;
  description: string | null;
  created_at: string;
}
