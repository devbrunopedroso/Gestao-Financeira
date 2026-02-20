'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  TrendingUp, Receipt, LayoutDashboard, PiggyBank, BarChart3,
} from 'lucide-react'

const bottomNavItems = [
  { href: '/incomes', label: 'Rendas', icon: TrendingUp },
  { href: '/expenses', label: 'Despesas', icon: Receipt },
  { href: '/', label: 'Home', icon: LayoutDashboard, isCenter: true },
  { href: '/piggy-banks', label: 'Caixinhas', icon: PiggyBank },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end justify-around px-2 h-16">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors',
                    isActive
                      ? 'bg-primary'
                      : 'bg-primary/90 hover:bg-primary'
                  )}
                >
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium mt-0.5 text-primary">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-2 min-w-[56px]"
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium mt-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
