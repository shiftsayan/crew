import type { Metadata } from "next";

import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Room admin",
};

export default function AdminPage() {
  return <AdminApp />;
}
