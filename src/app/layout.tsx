import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
