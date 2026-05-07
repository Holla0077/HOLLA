import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KashBoy — Your Smart Money Companion",
  description: "Send money, top up your wallet, and manage GHS & crypto in one clean dashboard. Built for Ghana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}