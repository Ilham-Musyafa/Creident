import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Creident",
  description: "Every deal, on record. A dispute-mediation prototype for peer-to-peer sales.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} ${brandFont.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
