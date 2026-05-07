import type { Metadata } from "next";
import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "KashBoy — Your Smart Money Companion",
  description: "Send money, top up your wallet, and manage GHS & crypto in one clean dashboard. Built for Ghana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased overflow-x-hidden bg-[#070B1A]">
        {children}
      </body>
    </html>
  );
}