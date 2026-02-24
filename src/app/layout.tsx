import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: "Diskominfo | Digital Lobby Experience",
  description: "Sistem registrasi kunjungan digital Diskominfo Kota Makassar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={notoSans.variable}>
      <body className={notoSans.className}>
        {/* Fluid Background - EXACT match to original */}
        <div className="fluid-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
        </div>

        {children}
      </body>
    </html>
  );
}
