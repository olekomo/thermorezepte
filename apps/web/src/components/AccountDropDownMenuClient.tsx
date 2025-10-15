'use client';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { LogOut, ChevronDown, Mail } from 'lucide-react';
import { toast } from 'sonner';
import LogoutButton from './LogoutButton';

type Props = {
  email?: string;
  name?: string;
  avatarUrl?: string | null;
};

function getInitial(name?: string, email?: string) {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  if (email?.trim()) return email.trim().charAt(0).toUpperCase();
  return 'U';
}

export default function AccountDropDownMenuClient({
  email,
  name,
  avatarUrl,
}: Props) {
  async function copyEmail() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      toast.success('E-Mail kopiert');
    } catch {
      toast.error('Konnte E-Mail nicht kopieren');
    }
  }

  const initial = getInitial(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
<Button
  variant="ghost"
  className="h-10 rounded-xl px-2 inline-flex items-center gap-2 leading-none data-[state=open]:bg-muted/70"
>

          {/* Avatar – sauber im Button ausgerichtet */}
          <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground/70 ring-1 ring-border">
            {avatarUrl ? (
              // 2) Avatar-Image: verhindert Baseline-Gap (verschiebt nicht mehr nach unten)
<Image
  src={avatarUrl}
  alt={name ?? email ?? 'User'}
  width={32}
  height={32}
  className="block h-full w-full rounded-full object-cover"
/>

            ) : (
              initial
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-2xl p-0"
      >
        <DropdownMenuLabel className="flex items-center gap-3 p-3">
          <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-foreground/70 ring-1 ring-border">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name ?? email ?? 'User'}
                width={40}
                height={40}
                className="h-full w-full rounded-full object-cover"
                priority
              />
            ) : (
              initial
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">
              {name ?? (email ? email.split('@')[0] : 'Benutzer')}
            </div>
            {email && (
              <button
                type="button"
                onClick={copyEmail}
                className="group mt-0.5 flex items-center gap-1 truncate text-left text-xs text-muted-foreground hover:text-foreground"
                title="E-Mail kopieren"
              >
                <Mail className="h-3.5 w-3.5 opacity-60 group-hover:opacity-80" />
                <span className="truncate">{email}</span>
              </button>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* spätere Gruppen/Links hier einfügen */}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          <LogoutButton className="-ml-1 h-auto px-0" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
