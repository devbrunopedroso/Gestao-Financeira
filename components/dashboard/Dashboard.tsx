'use client'

import { useState, useEffect } from 'react'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { MonthNavigator } from '@/components/ui/MonthNavigator'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/helpers'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Wallet, Heart,
  Plus, Receipt, PiggyBank, BarChart3,
} from 'lucide-react'

interface MonthlySummary {
  month: number
  year: number
  income: {
    fixed: number[]
    extra: number[]
    total: number
  }
  expenses: {
    fixed: { total: number }
    variable: { total: number }
    piggyBanks?: { total: number; items: Array<{ id: string; amount: number; description: string }> }
    total: number
  }
  balance: number
  health: {
    percentage: number
    status: 'excellent' | 'good' | 'warning' | 'critical'
  }
}

const healthConfig = {
  excellent: { label: 'Excelente', variant: 'success' as const, color: 'text-success' },
  good: { label: 'Boa', variant: 'default' as const, color: 'text-primary' },
  warning: { label: 'Atencao', variant: 'warning' as const, color: 'text-warning' },
  critical: { label: 'Critico', variant: 'destructive' as const, color: 'text-destructive' },
}

export function Dashboard() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccountId) {
      fetchSummary()
    }
  }, [selectedAccountId, currentMonth, currentYear])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
        if (data.length > 0) {
          setSelectedAccountId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/monthly-summary?accountId=${selectedAccountId}&month=${currentMonth}&year=${currentYear}`
      )
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Erro ao buscar resumo:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!loading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-center">Nenhuma conta financeira</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Crie sua primeira conta financeira para comecar a gerenciar suas financas.
        </p>
        <Button asChild size="lg">
          <Link href="/accounts/new">
            <Plus className="h-4 w-4 mr-2" />
            Criar Conta
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header com selector e navegador de mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <AccountSelector
          value={selectedAccountId}
          onChange={setSelectedAccountId}
        />
        <MonthNavigator
          month={currentMonth}
          year={currentYear}
          onMonthChange={(month, year) => {
            setCurrentMonth(month)
            setCurrentYear(year)
          }}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[100px] sm:h-[120px]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </div>
      ) : summary ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Renda Total"
              value={summary.income.total}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title="Despesas Totais"
              value={summary.expenses.total}
              icon={TrendingDown}
              variant="danger"
            />
            <StatCard
              title="Saldo do Mes"
              value={summary.balance}
              icon={Wallet}
              variant={summary.balance >= 0 ? 'success' : 'danger'}
            />
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Saude Financeira</p>
                  <p className={`text-lg sm:text-2xl font-bold mt-1 sm:mt-2 ${healthConfig[summary.health.status].color}`}>
                    {healthConfig[summary.health.status].label}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={healthConfig[summary.health.status].variant}>
                      {summary.health.percentage.toFixed(0)}% usado
                    </Badge>
                  </div>
                </div>
                <Heart className={`h-8 w-8 sm:h-10 sm:w-10 shrink-0 ml-2 ${healthConfig[summary.health.status].color}`} />
              </div>
            </Card>
          </div>

          {/* Detalhamento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Detalhamento de Rendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Renda Fixa</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {formatCurrency(summary.income.fixed.reduce((a: number, b: number) => a + b, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rendas Extras</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {formatCurrency(summary.income.extra.reduce((a: number, b: number) => a + b, 0))}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-base sm:text-lg text-success">
                      {formatCurrency(summary.income.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Detalhamento de Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Despesas Fixas</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {formatCurrency(summary.expenses.fixed.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Despesas Variaveis</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {formatCurrency(summary.expenses.variable.total)}
                    </span>
                  </div>
                  {summary.expenses.piggyBanks && summary.expenses.piggyBanks.total > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <PiggyBank className="h-3.5 w-3.5" /> Caixinhas
                      </span>
                      <span className="font-semibold text-sm sm:text-base">
                        {formatCurrency(summary.expenses.piggyBanks.total)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-base sm:text-lg text-destructive">
                      {formatCurrency(summary.expenses.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acoes Rapidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Acoes Rapidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { href: '/incomes', icon: TrendingUp, label: 'Adicionar Renda', color: 'text-success' },
                  { href: '/expenses', icon: Receipt, label: 'Lancar Despesa', color: 'text-destructive' },
                  { href: '/piggy-banks', icon: PiggyBank, label: 'Nova Caixinha', color: 'text-primary' },
                  { href: '/reports', icon: BarChart3, label: 'Ver Relatorios', color: 'text-warning' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link key={href} href={href}>
                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${color}`} />
                      <span className="text-xs sm:text-sm font-medium text-center">{label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Erro ao carregar dados do mes
        </div>
      )}
    </div>
  )
}
