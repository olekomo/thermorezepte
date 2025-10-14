'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="text-center">
      <Badge
        variant="secondary"
        className="mb-4 rounded-full bg-primary/10 text-primary uppercase tracking-[0.25em]"
      >
        Thermomix smarter nutzen
      </Badge>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto mb-4 max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
      >
        <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
          Mach aus Rezeptfotos echte Cookidoo-Anleitungen
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="mx-auto mb-8 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
      >
        Lade ein handgeschriebenes Rezept oder ein Foto deines Lieblingsgerichts hoch.
        Thermorezepte verwandelt es in eine strukturierte Schritt-für-Schritt-Anleitung
        für deinen Thermomix – klar, schnell und teilbar.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Button asChild variant="default" size="lg" className="h-14 rounded-2xl px-8">
          <Link href="/app" className="no-underline">
            <span className="inline-flex items-center gap-2">
              Jetzt kostenlos starten <ArrowRight className="size-5" aria-hidden />
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-14 rounded-2xl px-6">
          <Link href="#video" className="no-underline">
            <span className="inline-flex items-center gap-2">
              So funktioniert&apos;s <PlayCircle className="size-5" aria-hidden />
            </span>
          </Link>
        </Button>
      </motion.div>

      <div className="mt-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-4" aria-hidden /> Keine Registrierung für den Start nötig
        </span>
      </div>
    </section>
  );
}
