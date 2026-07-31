import type { Metadata } from "next";
import FinancePage from "@/components/admin/FinancePage";

export const metadata: Metadata = {
  title: "Kasa / Finans | Teknik Servis Admin",
  description: "Gelir, gider ve kasa bakiyesi takibi.",
};

export default function Page() {
  return <FinancePage />;
}
