'use client'

import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  icon?: LucideIcon
  iconEmoji?: string
  isCurrency?: boolean
}

export function StatCard({ title, value, subtitle, variant = 'default', icon: Icon, iconEmoji, isCurrency = true }: StatCardProps) {
  const variantStyles = {
    default: 'border-border bg-card',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    danger: 'border-destructive/30 bg-destructive/5',
  }

  const iconColors = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  }

  return (
    <div className={cn('rounded-lg border p-4 sm:p-6 transition-colors', variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 truncate">
            {isCurrency ? formatCurrency(value) : value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
        </div>
        {Icon && <Icon className={cn('h-8 w-8 sm:h-10 sm:w-10 shrink-0 ml-2', iconColors[variant])} />}
        {iconEmoji && <span className="text-2xl sm:text-3xl shrink-0 ml-2">{iconEmoji}</span>}
      </div>
    </div>
  )
}
