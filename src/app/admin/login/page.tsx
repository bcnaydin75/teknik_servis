import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminLoginSkeleton from "@/components/admin/AdminLoginSkeleton";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginSkeleton />}>
      <AdminLoginForm />
    </Suspense>
  );
}
