'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { RefreshCcw, AlertCircle, CheckCircle2, Loader2, Hourglass } from 'lucide-react'

type RecipeListItem = {
  id: string
  created_at: string
  title: string | null
  status: 'pending' | 'processing' | 'done' | 'error' | null
}

export default function RecipesPage() {
  const [items, setItems] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const supabase = supabaseBrowser()
      const { data, error } = await supabase
        .from('recipes')
        .select('id, created_at, title, status')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems((data ?? []) as RecipeListItem[])
    } catch (e: any) {
      setError(e?.message ?? 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await fetchData()
    })()
    return () => {
      alive = false
    }
  }, [fetchData])

  return (
    <div className="max-w-screen overflow-x-hidden px-0 py-0 mx-0">
      <h1 className="sr-only">Rezepte</h1>

      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">Deine Rezepte</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{error}</span>
                <Button size="sm" variant="secondary" onClick={fetchData}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Erneut laden
                </Button>
              </AlertDescription>
            </Alert>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/40 p-10 text-center">
              <p className="text-sm text-muted-foreground">Noch keine Rezepte.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {items.map((r) => (
                <li key={r.id} className="p-0">
                  <Link
                    href={`/recipes/${r.id}`}
                    className="block p-3 sm:p-4 transition-colors hover:bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-medium text-foreground">
                          {r.title || 'Unbenanntes Rezept'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString('de-DE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>

        <Separator className="mx-6" />

        <CardFooter className="flex items-center justify-center gap-2 py-4">
          <Button variant="secondary" onClick={fetchData}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Aktualisieren
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: RecipeListItem['status'] }) {
  if (status === 'done') {
    return (
      <Badge className="whitespace-nowrap border border-primary/20 bg-primary/10 text-primary">
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        Fertig
      </Badge>
    )
  }
  if (status === 'processing') {
    return (
      <Badge className="whitespace-nowrap border border-accent/30 bg-accent/20 text-foreground/80">
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        In Bearbeitung
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge className="whitespace-nowrap border border-destructive/20 bg-destructive/10 text-destructive">
        <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
        Fehler
      </Badge>
    )
  }
  // pending / null / unbekannt
  return (
    <Badge className="whitespace-nowrap border border-border bg-muted text-foreground/70">
      <Hourglass className="mr-1.5 h-3.5 w-3.5" />
      Wartet
    </Badge>
  )
}
