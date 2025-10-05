'use client'

import { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const maxWidthVariants = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  full: 'max-w-full',
} as const

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
    },
    defaultVariants: {
      position: 'sticky',
      bordered: true,
      height: 'md',
    },
  },
)

const headerContentVariants = cva('mx-auto flex items-center justify-between px-4', {
  variants: {
    maxWidth: maxWidthVariants,
  },
  defaultVariants: {
    maxWidth: 'sm',
  },
})

type HeaderProps = VariantProps<typeof headerVariants> &
  VariantProps<typeof headerContentVariants> & {
    left?: ReactNode
    right?: ReactNode
    title?: ReactNode
    className?: string
    contentClassName?: string
  }

export function Header({
  left,
  right,
  title,
  className,
  contentClassName,
  position,
  bordered,
  height,
  maxWidth,
}: HeaderProps) {
  return (
    <header className={cn(headerVariants({ position, bordered, height }), className)}>
      <div className={cn(headerContentVariants({ maxWidth }), contentClassName)}>
        <div className="flex w-1/3 items-center gap-2">{left}</div>
        <div className="flex w-1/3 items-center justify-center">
          {typeof title === 'string' ? (
            <span className="truncate font-semibold">{title}</span>
          ) : (
            title
          )}
        </div>
        <div className="flex w-1/3 items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  )
}
