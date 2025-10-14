'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import { Home, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils'; // falls du shadcn utils hast (sonst classnames)

export default function LoggedInLeftHeaderComponent({ user }: { user: User | null }) {
  void user; // aktuell ungenutzt, falls du später Avatar etc. anzeigen willst

  const router = useRouter();
  const pathname = usePathname();
  const [isRecipes, setIsRecipes] = useState(pathname === '/recipes');

  useEffect(() => {
    setIsRecipes(pathname === '/recipes');
  }, [pathname]);

  const handleClick = useCallback(() => {
    if (isRecipes) {
      router.push('/app');
    } else {
      router.push('/recipes');
    }
  }, [isRecipes, router]);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        className={cn(
          'rounded-xl transition-all',
          isRecipes
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-background hover:bg-muted'
        )}
      >
        {isRecipes ? (
          <>
            <Home className="mr-2 size-4" aria-hidden /> Home
          </>
        ) : (
          <>
            <BookOpen className="mr-2 size-4" aria-hidden /> Rezepteübersicht
          </>
        )}
      </Button>
    </div>
  );
}
