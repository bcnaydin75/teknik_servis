import type { Metadata } from "next";
import InventoryPage from "@/components/admin/InventoryPage";

export const metadata: Metadata = {
  title: "Stok Yönetimi | Teknik Servis Admin",
  description: "Parça envanteri ve stok takibi.",
};

export default function Page() {
  return <InventoryPage />;
}
