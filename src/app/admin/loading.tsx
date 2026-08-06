import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminLoading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-slate-950"
      style={{ backgroundColor: "#0f172a" }}
    >
      <LoadingSpinner size="lg" label="Yükleniyor..." />
    </div>
  );
}
