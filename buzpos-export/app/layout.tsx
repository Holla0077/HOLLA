import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUZ POS",
  description: "Nightclub Point of Sale System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
