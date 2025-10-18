// app/reset-password/page.tsx
"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// --- shadcn/ui ---
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// --- toast: sonner ---
import { Toaster, toast } from "sonner";
import { ROUTES } from "@/lib/routes";

// --- Supabase Client (browser) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

export default function ResetPasswordPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [hasSession, setHasSession] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // On mount: require a valid session that came from the recovery link
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setHasSession(Boolean(data.session));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      const msg = "Passwort muss mindestens 8 Zeichen haben.";
      setError(msg);
      toast.error("Ungültiges Passwort", { description: msg });
      return;
    }
    if (password !== confirm) {
      const msg = "Passwörter stimmen nicht überein.";
      setError(msg);
      toast.error("Bitte prüfen", { description: msg });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Passwort aktualisiert", {
        description: "Du kannst dich jetzt mit deinem neuen Passwort anmelden.",
      });

      // Optional: Session invalidieren, um Re-Login zu erzwingen
      await supabase.auth.signOut();
      router.replace(ROUTES.login+'?reset=success'); // ← Zielroute nach Erfolg (z. B. "/login?reset=success")
    } catch (err: any) {
      const msg = err?.message ?? "Unbekannter Fehler";
      setError(msg);
      toast.error("Fehler beim Aktualisieren", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <Toaster richColors />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Passwort zurücksetzen</CardTitle>
            <CardDescription>Lade…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-10 animate-pulse rounded-xl bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <Toaster richColors />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link abgelaufen oder ungültig</CardTitle>
            <CardDescription>
              Bitte fordere einen neuen Reset‑Link an und öffne die Seite erneut über die E‑Mail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>Hinweis</AlertTitle>
              <AlertDescription>
                Diese Seite funktioniert nur, wenn du sie über den Supabase‑Recovery‑Link aufrufst (wir benötigen eine gültige Session).
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={() => router.push(ROUTES.login)}>
              Neuen Link anfordern
            </Button>
            <Button variant="outline" onClick={() => router.push(ROUTES.loginOrCreateAccount)}>
              Zur Anmeldung
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <Toaster richColors />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Neues Passwort festlegen</CardTitle>
          <CardDescription>
            Bitte wähle ein starkes Passwort. Du wirst danach zur Anmeldung weitergeleitet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Neues Passwort</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1.5 top-1.5"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? "Verbergen" : "Anzeigen"}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm">Passwort bestätigen</Label>
              <Input
                id="confirm"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <Separator />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Speichere…" : "Passwort aktualisieren"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Tipp: Mind. 8 Zeichen, gern mit Zahl & Sonderzeichen.
        </CardFooter>
      </Card>
    </div>
  );
}
