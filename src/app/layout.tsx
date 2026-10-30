import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";

const bodyFont = localFont({
  src: "../fonts/dm-sans-latin-wght-normal.woff2",
  variable: "--font-body-loaded", weight: "400 800", display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
const headingFont = localFont({
  src: "../fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-heading-loaded", weight: "400 800", display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const brandFont = localFont({
  src: "../fonts/outfit-latin-wght-normal.woff2",
  variable: "--font-brand-loaded", weight: "100 900", display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const themeScript = `try{var t=localStorage.getItem('creident-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme='system'}catch(e){document.documentElement.dataset.theme='system'}`;

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  return {
  metadataBase: new URL(`${protocol}://${host}`),
  icons: { icon: [{ url: "/brand/v3/favicon.ico", sizes: "16x16 32x32" }, { url: "/brand/v3/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/v3/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/brand/v3/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/brand/v3/apple-touch-icon.png" },
  openGraph: { images: [{ url: "/brand/v3/og-image.png", width: 1200, height: 630, alt: "Creident — Every deal, on record." }] },
  twitter: { card: "summary_large_image", images: ["/brand/v3/og-image.png"] },
  title: "Creident",
  description: "Every deal, on record. A dispute-mediation prototype for peer-to-peer sales.",
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} ${brandFont.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
