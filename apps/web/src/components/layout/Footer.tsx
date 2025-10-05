import { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const maxWidthVariants = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  full: 'max-w-full',
} as const

const footerVariants = cva('w-full z-20 bg-background/80 backdrop-blur', {
  variants: {
    kind: {
      bottomBar: 'fixed inset-x-0 bottom-0 border-t',
      static: 'border-t',
    },
    height: {
      sm: 'h-14',
      md: 'h-16',
    },
  },
  defaultVariants: {
    kind: 'bottomBar',
    height: 'sm',
  },
})

const footerContentVariants = cva('mx-auto flex items-center justify-between px-6', {
  variants: {
    maxWidth: maxWidthVariants,
  },
  defaultVariants: {
    maxWidth: 'sm',
  },
})

type FooterProps = VariantProps<typeof footerVariants> &
  VariantProps<typeof footerContentVariants> & {
    children?: ReactNode
    className?: string
    contentClassName?: string
  }

export function Footer({
  kind,
  maxWidth,
  height,
  children,
  className,
  contentClassName,
}: FooterProps) {
  return (
    <footer className={cn(footerVariants({ kind, height }), className)}>
      <div className={cn(footerContentVariants({ maxWidth }), contentClassName)}>{children}</div>
    </footer>
  )
}
