import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Panel | Teknik Servis",
  description: "Teknik servis yönetim paneli — cihaz kayıtları ve durum takibi.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
