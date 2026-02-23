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
  description: "Quantra — The intelligent trading platform for serious traders. Algo signals, Tenali AI coaching, trading journal, and portfolio analytics. Not just tips — a complete trading system.",
  keywords: ["Quantra", "trading platform", "stock market", "NSE trading", "algo trading", "retail trader", "trade signals", "Tenali AI", "Nifty 50", "portfolio analytics"],
  openGraph: {
    title: "Quantra — Not Just Tips. A Complete System.",
    description: "The intelligent trading platform for serious traders. Build a real system, not just trade on tips.",
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
