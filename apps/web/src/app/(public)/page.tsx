import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        Zum Inhalt springen
      </a>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,theme(colors.primary/10),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(theme(colors.border)_1px,transparent_1px),linear-gradient(90deg,theme(colors.border)_1px,transparent_1px)] bg-[length:24px_24px] opacity-[0.15]" />
      </div>

      <Header
        maxWidth="full"
        position="sticky"
        height="auto"
        contentClassName="py-3"
        left={
          <Button asChild size="icon" className="h-12 w-12 rounded-xl no-underline">
            <Link href="/app" aria-label="Zur App">LOGO</Link>
          </Button>
        }
        right={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link href="#features" className="no-underline">Features</Link>
            </Button>
            <Button asChild size="default" variant="default" className="rounded-xl">
              <Link href="/log-in-or-create-account" className="no-underline">Anmelden</Link>
            </Button>
          </div>
        }
      />

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-16 text-center">
        <div className="mx-auto w-full max-w-6xl">
          <Hero />
          <div id="video" className="mt-20" />
          <FeatureGrid />
        </div>
      </main>

      <Footer kind="static" maxWidth="full" className="border-t border-border bg-muted/40 backdrop-blur" contentClassName="py-4">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Thermorezepte. Alle Rechte vorbehalten.</p>
            <div className="flex flex-wrap items-center gap-1">
              <Button asChild variant="link" size="sm" className="no-underline text-muted-foreground hover:text-foreground">
                <Link href="/impressum">Impressum</Link>
              </Button>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Button asChild variant="link" size="sm" className="no-underline text-muted-foreground hover:text-foreground">
                <Link href="/datenschutz">Datenschutz</Link>
              </Button>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Button asChild variant="link" size="sm" className="no-underline text-muted-foreground hover:text-foreground">
                <Link href="/kontakt">Kontakt</Link>
              </Button>
            </div>
          </div>
        </div>
      </Footer>
    </div>
  );
}
