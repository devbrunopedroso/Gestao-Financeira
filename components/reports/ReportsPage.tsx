'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import { MonthNavigator } from '@/components/ui/MonthNavigator'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/helpers'
import { MONTHS } from '@/lib/constants'
import {
  BarChart3, PieChart, TrendingUp, TrendingDown, PiggyBank,
  Target, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'

interface CategoryExpense {
  categoryId: string | null
  categoryName: string
  total: number
  count: number
}

interface MonthlyEvolution {
  month: number
  year: number
  income: number
  expenses: number
  balance: number
}

interface PiggyBankProgress {
  id: string
  name: string
  description: string | null
  targetAmount: number
  currentAmount: number
  progress: number
  remainingAmount: number
  deposits: number
  withdrawals: number
  transactionsCount: number
}

export function ReportsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  // Expenses by category
  const [categoryData, setCategoryData] = useState<{ categories: CategoryExpense[]; total: number } | null>(null)
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Monthly evolution
  const [evolution, setEvolution] = useState<MonthlyEvolution[]>([])
  const [loadingEvolution, setLoadingEvolution] = useState(false)

  // Piggy banks progress
  const [piggyData, setPiggyData] = useState<{
    piggyBanks: PiggyBankProgress[]; total: number; completed: number; inProgress: number; notStarted: number
  } | null>(null)
  const [loadingPiggy, setLoadingPiggy] = useState(false)

  const fetchCategoryReport = useCallback(async () => {
    if (!selectedAccountId) return
    setLoadingCategories(true)
    try {
      const res = await fetch(
        `/api/reports/expenses-by-category?accountId=${selectedAccountId}&month=${currentMonth}&year=${currentYear}`
      )
      if (res.ok) setCategoryData(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingCategories(false)
    }
  }, [selectedAccountId, currentMonth, currentYear])

  const fetchEvolution = useCallback(async () => {
    if (!selectedAccountId) return
    setLoadingEvolution(true)
    try {
      const endMonth = currentMonth
      const endYear = currentYear
      const startDate = new Date(currentYear, currentMonth - 1)
      startDate.setMonth(startDate.getMonth() - 5)
      const startMonth = startDate.getMonth() + 1
      const startYear = startDate.getFullYear()

      const res = await fetch(
        `/api/reports/monthly-evolution?accountId=${selectedAccountId}&startMonth=${startMonth}&startYear=${startYear}&endMonth=${endMonth}&endYear=${endYear}`
      )
      if (res.ok) {
        const data = await res.json()
        setEvolution(data.evolution || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingEvolution(false)
    }
  }, [selectedAccountId, currentMonth, currentYear])

  const fetchPiggyProgress = useCallback(async () => {
    if (!selectedAccountId) return
    setLoadingPiggy(true)
    try {
      const res = await fetch(`/api/reports/piggy-banks-progress?accountId=${selectedAccountId}`)
      if (res.ok) setPiggyData(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingPiggy(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    fetchCategoryReport()
    fetchEvolution()
    fetchPiggyProgress()
  }, [fetchCategoryReport, fetchEvolution, fetchPiggyProgress])

  const maxEvolutionValue = evolution.length > 0
    ? Math.max(...evolution.map(e => Math.max(e.income, e.expenses)))
    : 0

  const categoryColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-purple-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Relatorios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Analise detalhada das suas financas</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />
        <MonthNavigator month={currentMonth} year={currentYear} onMonthChange={(m, y) => { setCurrentMonth(m); setCurrentYear(y) }} />
      </div>

      {selectedAccountId && (
        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="categories" className="flex-1 sm:flex-initial gap-1">
              <PieChart className="h-4 w-4 hidden sm:inline" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="evolution" className="flex-1 sm:flex-initial gap-1">
              <TrendingUp className="h-4 w-4 hidden sm:inline" />
              Evolucao
            </TabsTrigger>
            <TabsTrigger value="piggybanks" className="flex-1 sm:flex-initial gap-1">
              <PiggyBank className="h-4 w-4 hidden sm:inline" />
              Caixinhas
            </TabsTrigger>
          </TabsList>

          {/* TAB: Expenses by Category */}
          <TabsContent value="categories" className="space-y-4">
            {loadingCategories ? (
              <div className="space-y-3">
                <Skeleton className="h-[90px]" />
                <Skeleton className="h-[300px]" />
              </div>
            ) : categoryData ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    title="Total Gastos"
                    value={categoryData.total}
                    icon={TrendingDown}
                    variant="danger"
                  />
                  <StatCard
                    title="Categorias"
                    value={categoryData.categories.length}
                    icon={PieChart}
                    variant="default"
                    isCurrency={false}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Gastos por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryData.categories.length === 0 ? (
                      <div className="text-center py-8">
                        <PieChart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhum gasto encontrado para este mes</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {categoryData.categories.map((cat, index) => {
                          const percentage = categoryData.total > 0
                            ? (cat.total / categoryData.total) * 100
                            : 0
                          return (
                            <div key={cat.categoryId || index} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-3 h-3 rounded-full shrink-0 ${categoryColors[index % categoryColors.length]}`} />
                                  <span className="font-medium truncate">{cat.categoryName}</span>
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {cat.count}x
                                  </Badge>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <span className="font-semibold">{formatCurrency(cat.total)}</span>
                                  <span className="text-muted-foreground ml-1 text-xs">({percentage.toFixed(1)}%)</span>
                                </div>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          )
                        })}

                        <Separator className="my-3" />
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm sm:text-base">Total</span>
                          <span className="font-bold text-destructive text-sm sm:text-base">
                            {formatCurrency(categoryData.total)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* TAB: Monthly Evolution */}
          <TabsContent value="evolution" className="space-y-4">
            {loadingEvolution ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-[90px]" />)}
                </div>
                <Skeleton className="h-[300px]" />
              </div>
            ) : evolution.length > 0 ? (
              <>
                {/* Summary of the last month in the evolution */}
                {(() => {
                  const lastMonth = evolution[evolution.length - 1]
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <StatCard title="Renda" value={lastMonth.income} icon={TrendingUp} variant="success" />
                      <StatCard title="Despesas" value={lastMonth.expenses} icon={TrendingDown} variant="danger" />
                      <StatCard
                        title="Saldo"
                        value={lastMonth.balance}
                        icon={lastMonth.balance >= 0 ? ArrowUpRight : ArrowDownRight}
                        variant={lastMonth.balance >= 0 ? 'success' : 'danger'}
                      />
                    </div>
                  )
                })()}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Evolucao Mensal (Ultimos 6 meses)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {evolution.map((item, index) => {
                        const incomeWidth = maxEvolutionValue > 0 ? (item.income / maxEvolutionValue) * 100 : 0
                        const expenseWidth = maxEvolutionValue > 0 ? (item.expenses / maxEvolutionValue) * 100 : 0
                        const monthName = MONTHS[item.month - 1]?.substring(0, 3) || `${item.month}`

                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium w-20 shrink-0">
                                {monthName}/{item.year.toString().slice(2)}
                              </span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-emerald-600 font-medium">{formatCurrency(item.income)}</span>
                                <Minus className="h-3 w-3 text-muted-foreground" />
                                <span className="text-red-600 font-medium">{formatCurrency(item.expenses)}</span>
                                <span className="mx-1">=</span>
                                <span className={`font-bold ${item.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatCurrency(item.balance)}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs w-6 text-muted-foreground">R</span>
                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${incomeWidth}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs w-6 text-muted-foreground">D</span>
                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-red-500 rounded-full transition-all"
                                    style={{ width: `${expenseWidth}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span>Renda (R)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Despesas (D)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="p-8">
                <div className="text-center space-y-3">
                  <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Nenhum dado de evolucao disponivel</p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB: Piggy Banks Progress */}
          <TabsContent value="piggybanks" className="space-y-4">
            {loadingPiggy ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[90px]" />)}
                </div>
                <Skeleton className="h-[200px]" />
              </div>
            ) : piggyData ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                    <p className="text-xl sm:text-2xl font-bold">{piggyData.total}</p>
                  </Card>
                  <Card className="p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">Concluidas</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">{piggyData.completed}</p>
                  </Card>
                  <Card className="p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">Em Progresso</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{piggyData.inProgress}</p>
                  </Card>
                  <Card className="p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">Nao Iniciadas</p>
                    <p className="text-xl sm:text-2xl font-bold text-muted-foreground">{piggyData.notStarted}</p>
                  </Card>
                </div>

                {piggyData.piggyBanks.length === 0 ? (
                  <Card className="p-8">
                    <div className="text-center space-y-3">
                      <PiggyBank className="h-10 w-10 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Nenhuma caixinha criada</p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {piggyData.piggyBanks.map(pb => (
                      <Card key={pb.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              {pb.name}
                            </CardTitle>
                            <Badge
                              variant={pb.progress >= 100 ? 'success' : pb.progress > 0 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {pb.progress}%
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Progress
                            value={pb.progress}
                            className="h-2.5"
                            indicatorClassName={
                              pb.progress >= 100 ? 'bg-emerald-500' : pb.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                            }
                          />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Atual</p>
                              <p className="font-semibold">{formatCurrency(pb.currentAmount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">Meta</p>
                              <p className="font-semibold">{formatCurrency(pb.targetAmount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Depositos</p>
                              <p className="font-semibold text-emerald-600">{formatCurrency(pb.deposits)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">Retiradas</p>
                              <p className="font-semibold text-red-600">{formatCurrency(pb.withdrawals)}</p>
                            </div>
                          </div>
                          {pb.remainingAmount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Falta {formatCurrency(pb.remainingAmount)} para atingir a meta
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
