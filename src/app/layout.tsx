import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HalcyVault",
  description: "A dispute-mediation prototype for peer-to-peer sales",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
