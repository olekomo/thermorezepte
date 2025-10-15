'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout fehlgeschlagen');
      toast.success('Abgemeldet');
      // sichere Navigation + Revalidate
      router.replace('/');
      startTransition(() => router.refresh());
    } catch (e: any) {
      toast.error(e?.message ?? 'Konnte dich nicht abmelden');
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={handleLogout}
      disabled={pending}
    >
      {pending ? 'Wird abgemeldet…' : 'Logout'}
    </Button>
  );
}
