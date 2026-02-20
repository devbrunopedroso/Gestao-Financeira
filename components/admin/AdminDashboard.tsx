'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/helpers'
import {
  ShieldCheck, LogOut, Users, Building2, Receipt,
  TrendingUp, PiggyBank, Target, Landmark, Tag, Ban, CheckCircle2,
} from 'lucide-react'

interface OverviewData {
  users: { total: number; active: number }
  accounts: number
  expenses: { fixed: number; variable: number; total: number }
  incomes: { fixed: number; extra: number; total: number }
  piggyBanks: number
  assets: { total: number; totalValue: number }
  goals: number
  categories: number
}

interface UserItem {
  id: string
  name: string | null
  email: string | null
  image: string | null
  blocked: boolean
  createdAt: string
  accounts: Array<{ id: string; name: string; role: string }>
  accountCount: number
}

interface AccountItem {
  id: string
  name: string
  createdAt: string
  creator: { id: string; name: string | null; email: string | null }
  members: Array<{ userId: string; name: string | null; email: string | null; role: string }>
  memberCount: number
  counts: {
    fixedIncomes: number
    extraIncomes: number
    fixedExpenses: number
    variableExpenses: number
    piggyBanks: number
    assets: number
  }
}

interface AdminDashboardProps {
  onLogout: () => void
}

const roleBadge: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDITOR: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-700',
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const res = await fetch('/api/admin/overview')
      if (res.ok) setOverview(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingOverview(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch('/api/admin/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const toggleBlock = async (userId: string, blocked: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked } : u))
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  useEffect(() => {
    fetchOverview()
    fetchUsers()
    fetchAccounts()
  }, [fetchOverview, fetchUsers, fetchAccounts])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' })
    } catch { /* ignore */ }
    onLogout()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Painel Admin</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Gestao Financeira</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="overview" className="flex-1 sm:flex-initial gap-1">
              <Landmark className="h-4 w-4 hidden sm:inline" />
              Visao Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 sm:flex-initial gap-1">
              <Users className="h-4 w-4 hidden sm:inline" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 sm:flex-initial gap-1">
              <Building2 className="h-4 w-4 hidden sm:inline" />
              Contas
            </TabsTrigger>
          </TabsList>

          {/* TAB: Overview */}
          <TabsContent value="overview" className="space-y-4">
            {loadingOverview ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-[100px]" />)}
              </div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard title="Usuarios" value={overview.users.total} icon={Users} variant="default" isCurrency={false} />
                  <StatCard title="Usuarios Ativos" value={overview.users.active} icon={Users} variant="success" isCurrency={false} />
                  <StatCard title="Contas" value={overview.accounts} icon={Building2} variant="default" isCurrency={false} />
                  <StatCard title="Categorias" value={overview.categories} icon={Tag} variant="default" isCurrency={false} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard title="Despesas Lancadas" value={overview.expenses.total} icon={Receipt} variant="danger" isCurrency={false} />
                  <StatCard title="Rendas Lancadas" value={overview.incomes.total} icon={TrendingUp} variant="success" isCurrency={false} />
                  <StatCard title="Caixinhas" value={overview.piggyBanks} icon={PiggyBank} variant="default" isCurrency={false} />
                  <StatCard title="Metas" value={overview.goals} icon={Target} variant="default" isCurrency={false} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-primary" />
                        Patrimonios
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total de Ativos</span>
                          <span className="font-semibold">{overview.assets.total}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor Total</span>
                          <span className="font-bold text-primary">{formatCurrency(overview.assets.totalValue)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-destructive" />
                        Lancamentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Despesas Fixas</span>
                          <span className="font-semibold">{overview.expenses.fixed}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Despesas Variaveis</span>
                          <span className="font-semibold">{overview.expenses.variable}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rendas Fixas</span>
                          <span className="font-semibold">{overview.incomes.fixed}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rendas Extras</span>
                          <span className="font-semibold">{overview.incomes.extra}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">Erro ao carregar dados</p>
            )}
          </TabsContent>

          {/* TAB: Users */}
          <TabsContent value="users" className="space-y-4">
            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-[80px]" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{users.length} usuarios</h2>
                </div>
                <div className="space-y-3">
                  {users.map((user) => (
                    <Card key={user.id} className={user.blocked ? 'opacity-60 border-destructive/30' : ''}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {user.image ? (
                              <img src={user.image} alt="" className="h-10 w-10 rounded-full shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{user.name || 'Sem nome'}</p>
                                {user.blocked && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Bloqueado</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 ml-13 sm:ml-0">
                            <Badge variant="outline" className="text-xs">
                              {user.accountCount} conta{user.accountCount !== 1 ? 's' : ''}
                            </Badge>
                            {user.accounts.map((acc) => (
                              <Badge key={acc.id} variant="secondary" className={`text-xs ${roleBadge[acc.role] || ''}`}>
                                {acc.name} ({acc.role})
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-13 sm:ml-0">
                            <p className="text-xs text-muted-foreground">
                              Desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                            <Button
                              variant={user.blocked ? 'outline' : 'destructive'}
                              size="sm"
                              className="gap-1 text-xs h-7"
                              onClick={() => toggleBlock(user.id, !user.blocked)}
                            >
                              {user.blocked ? (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> Desbloquear</>
                              ) : (
                                <><Ban className="h-3.5 w-3.5" /> Bloquear</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB: Accounts */}
          <TabsContent value="accounts" className="space-y-4">
            {loadingAccounts ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-[100px]" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{accounts.length} contas</h2>
                </div>
                <div className="space-y-3">
                  {accounts.map((acc) => (
                    <Card key={acc.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">{acc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Criador: {acc.creator.name || acc.creator.email} | Desde {new Date(acc.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs w-fit">
                            {acc.memberCount} membro{acc.memberCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs text-center">
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="font-bold">{acc.counts.fixedIncomes}</p>
                            <p className="text-muted-foreground">Rendas F.</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="font-bold">{acc.counts.extraIncomes}</p>
                            <p className="text-muted-foreground">Rendas E.</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="font-bold">{acc.counts.fixedExpenses}</p>
                            <p className="text-muted-foreground">Desp. F.</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="font-bold">{acc.counts.variableExpenses}</p>
                            <p className="text-muted-foreground">Desp. V.</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="font-bold">{acc.counts.piggyBanks}</p>
                            <p className="text-muted-foreground">Caixinhas</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="font-bold">{acc.counts.assets}</p>
                            <p className="text-muted-foreground">Ativos</p>
                          </div>
                        </div>
                        {acc.members.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {acc.members.map((m) => (
                              <Badge key={m.userId} variant="secondary" className={`text-xs ${roleBadge[m.role] || ''}`}>
                                {m.name || m.email} - {m.role}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
