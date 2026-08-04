import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh min-h-0 overflow-hidden">{children}</div>;
}
