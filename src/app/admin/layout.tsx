import { AdminThemeProvider } from "@/components/AdminThemeProvider";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
