'use client'

import { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const headerVariants = cva(
  'w-full z-20 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50',
  {
    variants: {
      position: {
        sticky: 'sticky top-0',
        static: '',
      },
      bordered: {
        true: 'border-b',
        false: '',
      },
      height: {
        sm: 'h-12',
        md: 'h-14',
      },
      maxWidth: {
        sm: 'max-w-screen-sm',
        md: 'max-w-screen-md',
        lg: 'max-w-screen-lg',
        full: 'max-w-full',
      },
    },
    defaultVariants: {
      position: 'sticky',
      bordered: true,
      height: 'md',
      maxWidth: 'sm',
    },
  },
)

type HeaderProps = VariantProps<typeof headerVariants> & {
  left?: ReactNode
  right?: ReactNode
  title?: ReactNode
  className?: string
}

export function Header({
  left,
  right,
  title,
  className,
  position,
  bordered,
  height,
  maxWidth,
}: HeaderProps) {
  return (
    <header className={cn(headerVariants({ position, bordered, height }), className)}>
      <div className={cn('mx-auto flex items-center justify-between px-4', maxWidth)}>
        <div className="flex w-1/3 items-center gap-2">{left}</div>
        <div className="flex w-1/3 items-center justify-center">
          {typeof title === 'string' ? (
            <span className="font-semibold truncate">{title}</span>
          ) : (
            title
          )}
        </div>
        <div className="flex w-1/3 items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  )
}
