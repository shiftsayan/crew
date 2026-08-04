import { cn } from "@/lib/utils";

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)} role="status">
      <span
        className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent animation-duration-[700ms]"
        data-slot="spinner"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
