import type { Metadata } from "next";

import { HalftoneArtworkLab } from "@/components/artwork/HalftoneArtworkLab";

export const metadata: Metadata = {
  title: "Halftone Artwork",
  description: "An interactive lab for the procedural halftone artwork.",
};

export default function HalftoneArtworkPage() {
  return <HalftoneArtworkLab />;
}
