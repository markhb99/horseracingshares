import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: true,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://horseracingshares.com"),
  title: {
    default: "Horse Racing Shares — The Australian home of racehorse shares",
    template: "%s · Horse Racing Shares",
  },
  description:
    "Browse the latest shares for sale in Australian racehorses — from 1% micro-shares to 10% stakes. Every listing is backed by a licensed syndicator and a Product Disclosure Statement.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-AU"
      className={cn(
        "h-full antialiased",
        fraunces.variable,
        inter.variable,
        jetbrainsMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
