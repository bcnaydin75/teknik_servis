import LoadingSpinner from "@/components/LoadingSpinner";

/** AdminThemeProvider içinde — dark: ile gündüz/gece uyumlu */
export default function AdminLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
      <LoadingSpinner size="lg" label="Yükleniyor..." />
    </div>
  );
}
