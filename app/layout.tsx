import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { SITE_NAME } from "@/lib/config";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — Play. Give. Win.`, template: `%s · ${SITE_NAME}` },
  description:
    "A subscription that turns your golf scores into monthly prize draws, while funding the charity you care about.",
};

export const viewport: Viewport = { themeColor: "#0B0C10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
