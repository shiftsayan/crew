import type { Metadata } from "next";

import { DecorationsGallery } from "@/components/game/DecorationsGallery";

export const metadata: Metadata = {
  title: "Decorations",
};

export default function DecorationsPage() {
  return <DecorationsGallery />;
}
