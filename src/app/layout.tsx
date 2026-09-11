import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "G26.3 Dashboard",
  description:
    "Trainings- und Gesundheitstracking zur Vorbereitung auf die arbeitsmedizinische Untersuchung G26.3 (Atemschutz).",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
