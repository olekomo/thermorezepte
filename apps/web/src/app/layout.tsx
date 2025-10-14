import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Thermorezepte – Rezeptfotos → Cookidoo-Anleitungen",
  description:
    "Mach aus Rezeptfotos echte, strukturierte Thermomix-Anleitungen – schnell, klar und teilbar.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
