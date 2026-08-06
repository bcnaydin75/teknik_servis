export default function AdminLoading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-400"
      style={{ backgroundColor: "#0f172a" }}
      role="status"
      aria-live="polite"
      aria-label="Yükleniyor"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-9 w-9 animate-pulse rounded-2xl bg-slate-700/80"
          aria-hidden
        />
        <p className="text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
}
