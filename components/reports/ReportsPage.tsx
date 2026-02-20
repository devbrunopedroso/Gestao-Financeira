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
import { NativeSelect } from '@/components/ui/select-native'
import {
  BarChart3, PieChart, TrendingUp, TrendingDown, PiggyBank,
  Target, ArrowUpRight, ArrowDownRight, Minus, ArrowLeftRight,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'

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
  const [categoryData, setCategoryData] = useState<{
    categories: CategoryExpense[]
    piggyBanks: { items: Array<{ id: string; description: string; amount: number }>; total: number }
    total: number
  } | null>(null)
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Monthly evolution
  const [evolution, setEvolution] = useState<MonthlyEvolution[]>([])
  const [loadingEvolution, setLoadingEvolution] = useState(false)

  // Piggy banks progress
  const [piggyData, setPiggyData] = useState<{
    piggyBanks: PiggyBankProgress[]; total: number; completed: number; inProgress: number; notStarted: number
  } | null>(null)
  const [loadingPiggy, setLoadingPiggy] = useState(false)

  // Month comparison
  const [compMonth1, setCompMonth1] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.getMonth() + 1
  })
  const [compYear1, setCompYear1] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.getFullYear()
  })
  const [compMonth2, setCompMonth2] = useState(new Date().getMonth() + 1)
  const [compYear2, setCompYear2] = useState(new Date().getFullYear())
  const [comparisonData, setComparisonData] = useState<any>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)

  // Cash flow projection
  const [projectionData, setProjectionData] = useState<any>(null)
  const [loadingProjection, setLoadingProjection] = useState(false)

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

  const fetchComparison = useCallback(async () => {
    if (!selectedAccountId) return
    setLoadingComparison(true)
    try {
      const res = await fetch(
        `/api/reports/month-comparison?accountId=${selectedAccountId}&month1=${compMonth1}&year1=${compYear1}&month2=${compMonth2}&year2=${compYear2}`
      )
      if (res.ok) setComparisonData(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingComparison(false)
    }
  }, [selectedAccountId, compMonth1, compYear1, compMonth2, compYear2])

  const fetchProjection = useCallback(async () => {
    if (!selectedAccountId) return
    setLoadingProjection(true)
    try {
      const res = await fetch(`/api/reports/cash-flow-projection?accountId=${selectedAccountId}&months=6`)
      if (res.ok) setProjectionData(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoadingProjection(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    fetchCategoryReport()
    fetchEvolution()
    fetchPiggyProgress()
    fetchComparison()
    fetchProjection()
  }, [fetchCategoryReport, fetchEvolution, fetchPiggyProgress, fetchComparison, fetchProjection])

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
          <TabsList className="w-full sm:w-auto overflow-x-auto">
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
            <TabsTrigger value="comparison" className="flex-1 sm:flex-initial gap-1">
              <ArrowLeftRight className="h-4 w-4 hidden sm:inline" />
              Comparativo
            </TabsTrigger>
            <TabsTrigger value="projection" className="flex-1 sm:flex-initial gap-1">
              <TrendingUp className="h-4 w-4 hidden sm:inline" />
              Projecao
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
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Caixinhas e Patrimônios */}
                {categoryData.piggyBanks && categoryData.piggyBanks.total > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-primary" />
                        Caixinhas e Patrimonios
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {categoryData.piggyBanks.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground truncate">{item.description}</span>
                            <span className="font-semibold shrink-0 ml-2">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">Subtotal Caixinhas</span>
                          <span className="font-bold text-primary text-sm">
                            {formatCurrency(categoryData.piggyBanks.total)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Total Geral */}
                <Card className="border-2">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base sm:text-lg">Total Geral de Despesas</span>
                      <span className="font-bold text-destructive text-base sm:text-lg">
                        {formatCurrency(categoryData.total)}
                      </span>
                    </div>
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

          {/* TAB: Month Comparison */}
          <TabsContent value="comparison" className="space-y-4">
            {/* Month selectors */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <NativeSelect value={compMonth1} onChange={e => setCompMonth1(Number(e.target.value))}>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </NativeSelect>
                    <NativeSelect value={compYear1} onChange={e => setCompYear1(Number(e.target.value))}>
                      {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                    </NativeSelect>
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-2 flex-1">
                    <NativeSelect value={compMonth2} onChange={e => setCompMonth2(Number(e.target.value))}>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </NativeSelect>
                    <NativeSelect value={compYear2} onChange={e => setCompYear2(Number(e.target.value))}>
                      {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                    </NativeSelect>
                  </div>
                  <Button size="sm" onClick={fetchComparison} disabled={loadingComparison}>
                    {loadingComparison ? 'Carregando...' : 'Comparar'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loadingComparison ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
            ) : comparisonData ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="py-3 text-center">
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="font-bold">{formatCurrency(comparisonData.month2.income)}</p>
                      {(() => {
                        const diff = comparisonData.month2.income - comparisonData.month1.income
                        return (
                          <p className={`text-xs ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          </p>
                        )
                      })()}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-3 text-center">
                      <p className="text-xs text-muted-foreground">Despesas</p>
                      <p className="font-bold">{formatCurrency(comparisonData.month2.expenses)}</p>
                      {(() => {
                        const diff = comparisonData.month2.expenses - comparisonData.month1.expenses
                        return (
                          <p className={`text-xs ${diff <= 0 ? 'text-success' : 'text-destructive'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          </p>
                        )
                      })()}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-3 text-center">
                      <p className="text-xs text-muted-foreground">Saldo</p>
                      <p className={`font-bold ${comparisonData.month2.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(comparisonData.month2.balance)}
                      </p>
                      {(() => {
                        const diff = comparisonData.month2.balance - comparisonData.month1.balance
                        return (
                          <p className={`text-xs ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          </p>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {comparisonData.biggestIncrease && (
                    <Card className="border-destructive/30">
                      <CardContent className="py-3 flex items-center gap-3">
                        <ArrowUpRight className="h-5 w-5 text-destructive shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Maior aumento</p>
                          <p className="font-medium text-sm">{comparisonData.biggestIncrease.categoryName}</p>
                          <p className="text-xs text-destructive">+{formatCurrency(comparisonData.biggestIncrease.change)} ({comparisonData.biggestIncrease.changePercent > 0 ? '+' : ''}{comparisonData.biggestIncrease.changePercent}%)</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {comparisonData.biggestSaving && (
                    <Card className="border-success/30">
                      <CardContent className="py-3 flex items-center gap-3">
                        <ArrowDownRight className="h-5 w-5 text-success shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Maior economia</p>
                          <p className="font-medium text-sm">{comparisonData.biggestSaving.categoryName}</p>
                          <p className="text-xs text-success">{formatCurrency(comparisonData.biggestSaving.change)} ({comparisonData.biggestSaving.changePercent}%)</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Category breakdown */}
                {comparisonData.changes?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {comparisonData.changes.map((c: any) => {
                        const maxVal = Math.max(c.month1Value, c.month2Value, 1)
                        return (
                          <div key={c.categoryId} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{c.categoryName}</span>
                              <Badge variant={c.change <= 0 ? 'success' : 'destructive'} className="text-xs">
                                {c.change >= 0 ? '+' : ''}{formatCurrency(c.change)}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-12 text-muted-foreground shrink-0">{MONTHS[compMonth1 - 1]?.slice(0, 3)}</span>
                                <div className="flex-1 bg-muted rounded-full h-2.5">
                                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(c.month1Value / maxVal) * 100}%` }} />
                                </div>
                                <span className="w-20 text-right shrink-0">{formatCurrency(c.month1Value)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-12 text-muted-foreground shrink-0">{MONTHS[compMonth2 - 1]?.slice(0, 3)}</span>
                                <div className="flex-1 bg-muted rounded-full h-2.5">
                                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${(c.month2Value / maxVal) * 100}%` }} />
                                </div>
                                <span className="w-20 text-right shrink-0">{formatCurrency(c.month2Value)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-8">
                <div className="text-center space-y-2">
                  <ArrowLeftRight className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Selecione dois meses e clique em Comparar.</p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB: Cash Flow Projection */}
          <TabsContent value="projection" className="space-y-4">
            {loadingProjection ? (
              <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-40" />)}</div>
            ) : projectionData && projectionData.projections?.length > 0 ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Projecao de Fluxo de Caixa
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Projeção para os próximos 6 meses baseada em receitas fixas, despesas fixas ativas, caixinhas e média de despesas variáveis dos últimos {projectionData.assumptions.avgVariableMonths} meses.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={projectionData.projections}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(v) => {
                            if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
                            return String(v)
                          }}
                          width={50}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip formatter={(value: unknown) => formatCurrency(Number(value))} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2} name="Receita" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="totalExpenses" stroke="#EF4444" strokeWidth={2} name="Despesas" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" name="Saldo" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Projected months breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {projectionData.projections.map((p: any) => (
                    <Card key={p.label}>
                      <CardContent className="py-3 text-center space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{p.label}</p>
                        <p className="text-xs text-success">+{formatCurrency(p.income)}</p>
                        <p className="text-xs text-destructive">-{formatCurrency(p.totalExpenses)}</p>
                        <Separator />
                        <p className={`font-bold text-sm ${p.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(p.balance)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Assumptions card */}
                <Card className="bg-muted/30">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>Premissas:</strong> Receita fixa mensal de {formatCurrency(projectionData.assumptions.fixedIncomeTotal)}.
                      Média de despesas variáveis: {formatCurrency(projectionData.assumptions.avgVariableTotal)}/mês
                      (baseado nos últimos {projectionData.assumptions.avgVariableMonths} meses).
                      Rendas extras e despesas variáveis sazonais não estão incluídas na projeção.
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="p-8">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Adicione receitas e despesas para ver a projeção.</p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
