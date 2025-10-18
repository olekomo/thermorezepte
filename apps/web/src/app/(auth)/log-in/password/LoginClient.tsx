'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ROUTES } from '@/lib/routes';

const schema = z.object({
  email: z.string().min(1, 'Bitte E-Mail eingeben').email('Ungültige E-Mail'),
  password: z.string().min(1, 'Bitte Passwort eingeben'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginClient() {
  const router = useRouter();

  // lazy Supabase-Client (wie bei dir)
  const supabaseRef = React.useRef<ReturnType<any> | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { supabaseBrowser } = await import('@/lib/supabase/browser');
      if (mounted) supabaseRef.current = supabaseBrowser();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [busy, setBusy] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  // Prefill E-Mail
  React.useEffect(() => {
    const prefill = sessionStorage.getItem('emailPrefill') || '';
    if (prefill) form.setValue('email', prefill, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = React.useCallback(
    async (values: FormValues) => {
      try {
        setBusy(true);
        const s =
          supabaseRef.current ??
          (await import('@/lib/supabase/browser')).supabaseBrowser();

        const { error } = await s.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success('Eingeloggt – weiterleiten …');
        router.replace('/app');
        // kleiner refresh um server state zu aktualisieren
        setTimeout(() => router.refresh(), 0);
      } catch (e: any) {
        toast.error(e?.message ?? 'Unbekannter Fehler beim Anmelden.');
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  const reset = React.useCallback(
    async (email: string) => {
      try {
        setBusy(true);
        const s =
          supabaseRef.current ??
          (await import('@/lib/supabase/browser')).supabaseBrowser();

        const origin = window.location.origin;

        const { error } = await s.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}${ROUTES.authCallbackRecoveryServer}`,
        });

        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Passwort-Reset gesendet. Bitte E-Mail prüfen.');
      } catch (e: any) {
        toast.error(e?.message ?? 'Unbekannter Fehler beim Zurücksetzen.');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return (
    <div className="mx-auto my-10 w-full max-w-md px-4">
      <h1 className="mb-6 text-center text-2xl font-semibold">Anmelden</h1>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(login)}
          className="grid gap-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-Mail-Adresse</FormLabel>
                <FormControl>
                  <Input
                    placeholder="z. B. max@example.com"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // Prefill aktuell halten
                      sessionStorage.setItem('emailPrefill', e.target.value ?? '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passwort</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Dein Passwort"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2"
                      onClick={() => setShowPw((v) => !v)}
                      aria-pressed={showPw}
                      aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      {showPw ? 'Verbergen' : 'Anzeigen'}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="h-12 rounded-xl"
            disabled={busy || !form.formState.isValid}
          >
            {busy ? 'Anmelden …' : 'Anmelden'}
          </Button>
        </form>
      </Form>

      <div className="mt-2 flex justify-end">
        <Button
          variant="link"
          onClick={() => reset(form.getValues('email'))}
          disabled={busy || !form.getValues('email')}
          className="px-0"
        >
          Passwort vergessen
        </Button>
      </div>
    </div>
  );
}
