import type { ReactNode } from "react";

type NoticeProps = {
  children: ReactNode;
  tone?: "info" | "warning" | "error" | "success";
  live?: boolean;
};

export function Notice({ children, tone = "info", live = false }: NoticeProps) {
  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={live ? "polite" : undefined}
    >
      {children}
    </div>
  );
}
