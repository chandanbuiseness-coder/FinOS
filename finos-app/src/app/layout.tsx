import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { PortfolioProvider } from "@/context/PortfolioContext";
import ClientLayout from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: {
    default: "Quantra — Not Just Tips. A Complete System.",
    template: "%s | Quantra",
  },
  description: "Quantra — India's intelligent trading platform. Algo signals, AI coaching via Tenali AI, trading journal, and wealth building for retail traders. Sirf Tips Nahi. Ek Poora System.",
  keywords: ["Quantra", "Indian stock market", "NSE trading", "algo trading India", "retail trader", "trade signals", "Tenali AI", "Nifty 50"],
  openGraph: {
    title: "Quantra — Not Just Tips. A Complete System.",
    description: "Ab Andhere Mein Mat Trade Karo. India's intelligent trading platform for retail traders.",
    siteName: "Quantra",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PortfolioProvider>
          <ClientLayout>{children}</ClientLayout>
        </PortfolioProvider>
      </body>
    </html>
  );
}
