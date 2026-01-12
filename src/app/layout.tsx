import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="id" className={spaceGrotesk.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={spaceGrotesk.className}>
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
