'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  LayoutDashboard, Wallet, TrendingUp, Receipt, Tag,
  PiggyBank, Building2, BarChart3, Menu, X, LogOut, Target, Calculator, Moon, Sun, Download, Share,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface NavbarProps {
  userName?: string | null
  userImage?: string
}

const navLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Contas', icon: Wallet },
  { href: '/incomes', label: 'Rendas', icon: TrendingUp },
  { href: '/expenses', label: 'Despesas', icon: Receipt },
  { href: '/categories', label: 'Categorias', icon: Tag },
  { href: '/piggy-banks', label: 'Caixinhas', icon: PiggyBank },
  { href: '/patrimonios', label: 'Patrimonios', icon: Building2 },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/simulador', label: 'Simulador', icon: Calculator },
  { href: '/reports', label: 'Relatorios', icon: BarChart3 },
]

// Páginas que já estão no BottomNav — não mostrar no menu mobile
const bottomNavHrefs = new Set(['/', '/incomes', '/expenses', '/piggy-banks', '/reports'])
const mobileMenuLinks = navLinks.filter((link) => !bottomNavHrefs.has(link.href))

export function Navbar({ userName, userImage }: NavbarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { canInstall, isIOS, install } = usePWAInstall()
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="hidden sm:inline">Gestao Financeira</span>
              <span className="sm:hidden">GF</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* User + Mobile toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {userImage && <AvatarImage src={userImage} alt={userName || ''} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden lg:inline">{userName}</span>
              </div>
              {canInstall && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={install}
                  className="hidden sm:flex gap-1 text-primary"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden lg:inline">Instalar</span>
                </Button>
              )}
              {isIOS && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIOSGuide(!showIOSGuide)}
                  className="hidden sm:flex gap-1 text-primary"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden lg:inline">Instalar</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hidden sm:flex h-8 w-8 text-muted-foreground"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="hidden sm:flex gap-1 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sair</span>
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* iOS install guide (desktop) */}
      {showIOSGuide && isIOS && !mobileOpen && (
        <div className="hidden sm:block border-b bg-muted/50 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-start gap-3">
              <Share className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm space-y-1 flex-1">
                <p className="font-semibold">Para instalar no iPhone/iPad:</p>
                <p>1. Toque no icone <Share className="h-3.5 w-3.5 inline" /> (Compartilhar) do Safari</p>
                <p>2. Role e toque em <strong>&quot;Adicionar a Tela de Inicio&quot;</strong></p>
                <p>3. Toque em <strong>&quot;Adicionar&quot;</strong></p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowIOSGuide(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="fixed inset-0 bg-black/20" />
          <div
            className="fixed top-14 left-0 right-0 z-40 border-b bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 space-y-1">
              {mobileMenuLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                )
              })}
              {(canInstall || isIOS) && (
                <div className="border-t my-2 pt-2">
                  {canInstall && (
                    <button
                      onClick={() => { install(); setMobileOpen(false) }}
                      className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent transition-colors"
                    >
                      <Download className="h-5 w-5" />
                      Instalar Aplicativo
                    </button>
                  )}
                  {isIOS && (
                    <button
                      onClick={() => setShowIOSGuide(!showIOSGuide)}
                      className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent transition-colors"
                    >
                      <Download className="h-5 w-5" />
                      Instalar Aplicativo
                    </button>
                  )}
                  {showIOSGuide && isIOS && (
                    <div className="mx-3 mt-1 p-3 rounded-lg bg-muted text-xs space-y-1.5">
                      <p className="font-semibold">Para instalar no iPhone/iPad:</p>
                      <p className="flex items-center gap-1.5">1. Toque em <Share className="h-3.5 w-3.5 inline" /> (Compartilhar)</p>
                      <p>2. Role e toque em <strong>&quot;Adicionar a Tela de Inicio&quot;</strong></p>
                      <p>3. Toque em <strong>&quot;Adicionar&quot;</strong></p>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t my-2 pt-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    {userImage && <AvatarImage src={userImage} alt={userName || ''} />}
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1">{userName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="gap-1 text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
