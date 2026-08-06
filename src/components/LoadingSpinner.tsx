type LoadingSpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const SIZE = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

/** Yuvarlak dönen yükleme göstergesi */
export default function LoadingSpinner({
  className = "",
  size = "md",
  label,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Yükleniyor"}
    >
      <svg
        className={`${SIZE[size]} animate-spin text-blue-500`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      ) : null}
    </div>
  );
}
