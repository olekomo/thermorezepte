'use client';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Crown, Settings, LogOut, ChevronDown, Mail } from 'lucide-react';
import { toast } from 'sonner';
import LogoutButton from './LogoutButton';

type Props = {
  email?: string;
  name?: string;
  avatarUrl?: string | null;
};

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-xl px-2 hover:bg-muted"
        >
          <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs text-foreground/70">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name ?? email ?? 'User'}
                fill
                sizes="32px"
                className="object-cover"
              />
            ) : (
              (name?.charAt(0).toUpperCase() ?? 'U')
            )}
          </div>
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-2xl">
        <DropdownMenuLabel className="flex items-center gap-3 p-3">
          <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-muted text-sm text-foreground/70">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name ?? email ?? 'User'}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              (name?.charAt(0).toUpperCase() ?? 'U')
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{name ?? 'Benutzer'}</div>
            {email && (
              <button
                type="button"
                onClick={copyEmail}
                className="group flex items-center gap-1 truncate text-left text-xs text-muted-foreground hover:text-foreground"
                title="E-Mail kopieren"
              >
                <Mail className="size-3.5 opacity-60 group-hover:opacity-80" />
                <span className="truncate">{email}</span>
              </button>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/pricing" className="flex items-center">
              <Crown className="mr-2 size-4 text-amber-500" aria-hidden />
              Plan upgraden
              <DropdownMenuShortcut>Pro</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/settings" className="flex items-center">
              <Settings className="mr-2 size-4" aria-hidden />
              Einstellungen
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          // wichtig: Radix schließt sonst sofort; wir führen Click in Item aus
          onSelect={(e) => e.preventDefault()}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 size-4" aria-hidden />
          <LogoutButton className="-ml-1 px-0 h-auto" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
