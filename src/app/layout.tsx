import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jakarta = localFont({ src: "../fonts/plus-jakarta-sans-latin-wght-normal.woff2", weight: "400 800", display: "swap", variable: "--font-jakarta" });
const themeScript = `try{var t=localStorage.getItem('halcyvault-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme='system'}catch(e){document.documentElement.dataset.theme='system'}`;

export const metadata: Metadata = {
  title: "HalcyVault",
  description: "A dispute-mediation prototype for peer-to-peer sales",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
