'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabaseBrowser } from '@/lib/supabase/browser';

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

const schema = z.object({
  email: z.string().min(1, 'Bitte E-Mail eingeben').email('Ungültige E-Mail'),
  password: z
    .string()
    .min(8, 'Mindestens 8 Zeichen')
    .refine((v) => /[A-Za-z]/.test(v), { message: 'Mindestens 1 Buchstabe' })
    .refine((v) => /\d/.test(v), { message: 'Mindestens 1 Zahl' }),
});

type FormValues = z.infer<typeof schema>;

export default function CreateAccountPage() {
  const s = useMemo(() => supabaseBrowser(), []);
  const [busy, setBusy] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  // Prefill E-Mail aus Session Storage
  React.useEffect(() => {
    const prefill = sessionStorage.getItem('emailPrefill') || '';
    if (prefill) form.setValue('email', prefill, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: FormValues) {
    try {
      setBusy(true);
      const redirect = `${location.origin}/api/auth/callback?redirect=/app`;
      const { error } = await s.auth.signUp({
        email: values.email,
        password: values.password,
        options: { emailRedirectTo: redirect },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Check deine E-Mails zur Bestätigung.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Unbekannter Fehler.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto my-10 w-full max-w-md px-4">
      <h1 className="mb-6 text-center text-2xl font-semibold">Account erstellen</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                      placeholder="Mind. 8 Zeichen, 1 Zahl"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Mindestens 8 Zeichen, mindestens 1 Buchstabe und 1 Zahl.
                </p>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="h-12 rounded-xl"
            disabled={busy || !form.formState.isValid}
          >
            {busy ? 'Erstellen …' : 'Erstellen'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
