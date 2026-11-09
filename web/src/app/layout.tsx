import type { Metadata } from "next";
import { Archivo_Black, Geist, Space_Mono } from "next/font/google";
import { profile } from "@/data/portfolio";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Archivo_Black({ variable: "--font-archivo", weight: "400", subsets: ["latin"] });
const mono = Space_Mono({ variable: "--font-space-mono", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${profile.name} · ${profile.role}`,
  description: profile.bio,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0d0d0d]">{children}</body>
    </html>
  );
}
