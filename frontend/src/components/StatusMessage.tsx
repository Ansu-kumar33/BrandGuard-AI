import { AppIcon } from "./AppIcon";

interface StatusMessageProps {
  kind: "success" | "error";
  children: React.ReactNode;
}

export function StatusMessage({ kind, children }: StatusMessageProps) {
  const isSuccess = kind === "success";
  return (
    <div
      aria-live="polite"
      className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
      role={isSuccess ? "status" : "alert"}
    >
      <AppIcon
        name={isSuccess ? "check" : "alert"}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span>{children}</span>
    </div>
  );
}
