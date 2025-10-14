'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { GoogleSignInButton } from '@/components/oauth/GoogleSignInButton';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Bitte E-Mail eingeben')
    .email('Das ist keine gültige E-Mail'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginOrCreateAccountClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  // Prefill aus Session Storage
  React.useEffect(() => {
    const prefill = sessionStorage.getItem('emailPrefill');
    if (prefill) form.setValue('email', prefill, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistiere Eingabe
  const email = form.watch('email');
  React.useEffect(() => {
    sessionStorage.setItem('emailPrefill', email ?? '');
  }, [email]);

  async function checkUser(email: string) {
    const res = await fetch('/api/auth/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Check fehlgeschlagen');
    const data = await res.json();
    return Boolean(data?.exists);
  }

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      const exists = await checkUser(values.email);
      router.push(exists ? '/log-in/password' : '/create-account/password');
    } catch (err) {
      console.error(err);
      toast.error("Etwas ist schiefgelaufen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto my-10 w-full max-w-md px-4">
      <Card className="rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle>Anmelden</CardTitle>
          <CardDescription>Starte mit Google oder deiner E-Mail-Adresse</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <GoogleSignInButton />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">oder</span>
            <Separator className="flex-1" />
          </div>

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
                        type="email"
                        placeholder="z. B. max@example.com"
                        autoComplete="email"
                        inputMode="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                className="h-12 rounded-xl"
                disabled={!form.formState.isValid || isSubmitting}
              >
                {isSubmitting ? 'Wird geprüft …' : 'Weiter'}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-xs text-muted-foreground">
          Durch den Start stimmst du unseren Nutzungsbedingungen & Datenschutzhinweisen zu.
        </CardFooter>
      </Card>
    </div>
  );
}
