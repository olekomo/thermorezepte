'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

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
  className={`inline-flex items-center gap-2 ${className}`}
  onClick={handleLogout}
  disabled={pending}
>
  <LogOut className="h-4 w-4 shrink-0 ml-2" aria-hidden="true" />
  <span className="leading-none">
    {pending ? 'Wird abgemeldet…' : 'Logout'}
  </span>
</Button>

  );
}
