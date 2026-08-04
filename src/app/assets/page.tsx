import type { Metadata } from "next";

import { AssetsGallery } from "@/components/game/AssetsGallery";

export const metadata: Metadata = {
  title: "Assets",
};

export default function AssetsPage() {
  return <AssetsGallery />;
}
