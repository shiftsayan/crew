import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import "./globals.css";

const SITE_EMOJI = "🧑‍🚀";
const favicon = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#eef2ff"/>
    <text x="32" y="34" dominant-baseline="middle" text-anchor="middle" font-size="42">${SITE_EMOJI}</text>
  </svg>
`)}`;

export const metadata: Metadata = {
  title: {
    default: "Crew",
    template: "%s · Crew",
  },
  description: "A companion for playing The Crew with friends.",
  icons: {
    icon: favicon,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#4338ca",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
