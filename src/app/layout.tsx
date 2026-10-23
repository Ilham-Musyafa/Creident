import type { Metadata } from "next";
import "./globals.css";

const themeScript = `try{var t=localStorage.getItem('creident-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme='system'}catch(e){document.documentElement.dataset.theme='system'}`;

export const metadata: Metadata = {
  title: "Creident",
  description: "Every deal, on record. A dispute-mediation prototype for peer-to-peer sales.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
