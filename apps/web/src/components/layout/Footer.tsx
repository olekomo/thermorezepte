import { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const footerVariants = cva('w-full z-20 bg-background/80 backdrop-blur', {
  variants: {
    kind: {
      bottomBar: 'fixed inset-x-0 bottom-0 border-t',
      static: 'border-t',
    },
    maxWidth: {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      full: 'max-w-full',
    },
    height: {
      sm: 'h-14',
      md: 'h-16',
    },
  },
  defaultVariants: {
    kind: 'bottomBar',
    maxWidth: 'sm',
    height: 'sm',
  },
})

type FooterProps = VariantProps<typeof footerVariants> & {
  children?: ReactNode
  className?: string
}

export function Footer({ kind, maxWidth, height, children, className }: FooterProps) {
  return (
    <footer className={cn(footerVariants({ kind, maxWidth, height }), className)}>
      <div className={cn('mx-auto flex items-center justify-between px-6', maxWidth)}>
        {children}
      </div>
    </footer>
  )
}
