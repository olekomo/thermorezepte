'use client';

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  { title: "📷 Foto → Rezept", desc: "Lade ein Rezeptfoto hoch – Zutaten und Schritte werden automatisch erkannt." },
  { title: "🧭 Schritt-für-Schritt", desc: "Erhalte klare Anweisungen inkl. Temperaturen, Zeiten und Geschwindigkeiten." },
  { title: "🤝 Teilen & speichern", desc: "Sammle Lieblingsrezepte, teile sie mit Freunden oder exportiere sie für später." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, delay: 0.05 * i }}
        >
          <Card className="group rounded-2xl border-border/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-left">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-left text-muted-foreground">{f.desc}</CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}
