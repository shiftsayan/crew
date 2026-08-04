import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Artwork } from "@/components/artwork/Artwork";
import { Toaster } from "@/components/ui/sonner";

import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "@fontsource/geist-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Crew",
    template: "%s · The Crew",
  },
  description: "A companion for playing The Crew with friends.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className="min-h-full w-full overflow-x-hidden bg-background scheme-light overscroll-x-none"
      lang="en"
    >
      <body className="relative isolate min-h-dvh w-full max-w-full overflow-x-hidden bg-background font-sans text-base leading-6 text-foreground overscroll-x-none [text-rendering:optimizeLegibility]">
        <Artwork
          className="fixed"
          effect={{ kind: "ascii", animated: true }}
          src="/crew-clouds.jpg"
        />
        <a
          className="fixed top-3 left-3 z-2000 translate-y-[-160%] rounded-md bg-gray-900 px-4 py-[0.65rem] text-white focus:translate-y-0"
          href="#main-content"
        >
          Skip to content
        </a>
        <div className="relative z-10 min-h-dvh">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
