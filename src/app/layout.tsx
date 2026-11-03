import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IG Social AI — Your Instagram operating system",
  description: "Plan, create, approve and manage Instagram content with Claude."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
