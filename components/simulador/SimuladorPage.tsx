'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/helpers'
import {
  Calculator, TrendingUp, DollarSign, BarChart3,
  LineChart as LineChartIcon, ArrowRight,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'

interface SimulationResult {
  monthlyData: Array<{
    month: number
    label: string
    invested: number
    total: number
    earnings: number
  }>
  finalAmount: number
  totalInvested: number
  totalEarnings: number
  realFinalAmount?: number
}

interface ComparisonResult {
  label: string
  color: string
  rate: number
  data: Array<{ month: number; label: string; total: number }>
  finalAmount: number
}

const RATE_PRESETS = [
  { label: 'Poupanca', key: 'poupanca' },
  { label: 'CDI', key: 'cdi' },
  { label: 'Selic', key: 'selic' },
  { label: 'IPCA+6%', key: 'ipca6' },
  { label: 'Personalizado', key: 'custom' },
] as const

type RatePresetKey = (typeof RATE_PRESETS)[number]['key']

function calculateSimulation(
  initialAmount: number,
  monthlyDeposit: number,
  months: number,
  annualRate: number,
  inflationRate?: number,
): SimulationResult {
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
  const monthlyInflation = inflationRate
    ? Math.pow(1 + inflationRate / 100, 1 / 12) - 1
    : 0

  const monthlyData: SimulationResult['monthlyData'] = []
  let balance = initialAmount

  for (let m = 0; m <= months; m++) {
    const invested = initialAmount + monthlyDeposit * m
    const year = Math.floor(m / 12)
    const mo = (m % 12) + 1

    monthlyData.push({
      month: m,
      label: m === 0 ? 'Inicio' : m % 12 === 0 ? `Ano ${year}` : `M${m}`,
      invested,
      total: Math.round(balance * 100) / 100,
      earnings: Math.round((balance - invested) * 100) / 100,
    })

    if (m < months) {
      balance = balance * (1 + monthlyRate) + monthlyDeposit
    }
  }

  const totalInvested = initialAmount + monthlyDeposit * months
  const totalEarnings = balance - totalInvested

  let realFinalAmount: number | undefined
  if (inflationRate && inflationRate > 0) {
    realFinalAmount = balance / Math.pow(1 + monthlyInflation, months)
  }

  return {
    monthlyData,
    finalAmount: Math.round(balance * 100) / 100,
    totalInvested,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    realFinalAmount: realFinalAmount ? Math.round(realFinalAmount * 100) / 100 : undefined,
  }
}

function calculateComparison(
  initialAmount: number,
  monthlyDeposit: number,
  months: number,
  scenarios: Array<{ label: string; color: string; rate: number }>,
): ComparisonResult[] {
  return scenarios.map((scenario) => {
    const monthlyRate = Math.pow(1 + scenario.rate / 100, 1 / 12) - 1
    let balance = initialAmount
    const data: ComparisonResult['data'] = []

    for (let m = 0; m <= months; m++) {
      const year = Math.floor(m / 12)
      data.push({
        month: m,
        label: m === 0 ? 'Inicio' : m % 12 === 0 ? `Ano ${year}` : `M${m}`,
        total: Math.round(balance * 100) / 100,
      })
      if (m < months) {
        balance = balance * (1 + monthlyRate) + monthlyDeposit
      }
    }

    return {
      ...scenario,
      data,
      finalAmount: Math.round(balance * 100) / 100,
    }
  })
}

export function SimuladorPage() {
  const [initialAmount, setInitialAmount] = useState(1000)
  const [monthlyDeposit, setMonthlyDeposit] = useState(500)
  const [periodYears, setPeriodYears] = useState(5)
  const [periodMonths, setPeriodMonths] = useState(0)
  const [annualRate, setAnnualRate] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<RatePresetKey>('cdi')
  const [considerInflation, setConsiderInflation] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  const [marketRates, setMarketRates] = useState<{
    selic: number; cdi: number; ipca: number; poupanca: number
  }>({ selic: 0, cdi: 0, ipca: 0, poupanca: 0 })
  const [loadingRates, setLoadingRates] = useState(true)

  const [result, setResult] = useState<SimulationResult | null>(null)
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([])

  useEffect(() => {
    fetchMarketRates()
  }, [])

  const fetchMarketRates = async () => {
    try {
      const res = await fetch('/api/market-rates')
      if (res.ok) {
        const data = await res.json()
        const selic = data.selic ? parseFloat(data.selic.value) : 14.25
        const cdi = data.cdi ? parseFloat(data.cdi.value) : 14.15
        const ipca = data.ipca ? parseFloat(data.ipca.value) : 4.5
        const poupanca = selic > 8.5
          ? (Math.pow(1.005, 12) - 1) * 100
          : selic * 0.7

        setMarketRates({ selic, cdi, ipca, poupanca })
        // Default to CDI
        setAnnualRate(cdi)
      }
    } catch {
      // Use defaults
      setMarketRates({ selic: 14.25, cdi: 14.15, ipca: 4.5, poupanca: 6.17 })
      setAnnualRate(14.15)
    } finally {
      setLoadingRates(false)
    }
  }

  const handlePresetChange = (key: RatePresetKey) => {
    setSelectedPreset(key)
    if (key === 'poupanca') setAnnualRate(marketRates.poupanca)
    else if (key === 'cdi') setAnnualRate(marketRates.cdi)
    else if (key === 'selic') setAnnualRate(marketRates.selic)
    else if (key === 'ipca6') setAnnualRate(marketRates.ipca + 6)
    // 'custom' keeps current value
  }

  const totalMonths = periodYears * 12 + periodMonths

  const handleSimulate = () => {
    if (totalMonths <= 0) return
    const sim = calculateSimulation(
      initialAmount,
      monthlyDeposit,
      totalMonths,
      annualRate,
      considerInflation ? marketRates.ipca : undefined,
    )
    setResult(sim)
    setShowComparison(false)
    setComparisonResults([])
  }

  const handleCompare = () => {
    if (totalMonths <= 0) return
    const scenarios = [
      { label: 'Poupanca', color: '#f59e0b', rate: marketRates.poupanca },
      { label: 'CDI', color: '#3b82f6', rate: marketRates.cdi },
      { label: 'Selic', color: '#10b981', rate: marketRates.selic },
    ]
    const results = calculateComparison(initialAmount, monthlyDeposit, totalMonths, scenarios)
    setComparisonResults(results)
    setShowComparison(true)
  }

  // Filter chart data to show yearly points + last month for readability
  const chartData = useMemo(() => {
    if (!result) return []
    return result.monthlyData.filter((d, i) =>
      i === 0 || i === result.monthlyData.length - 1 || d.month % 12 === 0
    )
  }, [result])

  const comparisonChartData = useMemo(() => {
    if (comparisonResults.length === 0) return []
    const months = comparisonResults[0].data.length
    const combined = []
    for (let i = 0; i < months; i++) {
      const d = comparisonResults[0].data[i]
      if (i === 0 || i === months - 1 || d.month % 12 === 0) {
        const point: Record<string, unknown> = { month: d.month, label: d.label }
        for (const r of comparisonResults) {
          point[r.label] = r.data[i].total
        }
        combined.push(point)
      }
    }
    return combined
  }, [comparisonResults])

  // Year-by-year table
  const yearlyTable = useMemo(() => {
    if (!result) return []
    return result.monthlyData.filter(d => d.month > 0 && d.month % 12 === 0)
  }, [result])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Simulador de Investimentos</h1>
          <p className="text-sm text-muted-foreground">Calcule rendimentos com juros compostos</p>
        </div>
      </div>

      {/* Taxas atuais */}
      {!loadingRates && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            Selic: {marketRates.selic.toFixed(2)}% a.a.
          </Badge>
          <Badge variant="outline" className="text-xs">
            CDI: {marketRates.cdi.toFixed(2)}% a.a.
          </Badge>
          <Badge variant="outline" className="text-xs">
            IPCA: {marketRates.ipca.toFixed(2)}% a.a.
          </Badge>
          <Badge variant="outline" className="text-xs">
            Poupanca: {marketRates.poupanca.toFixed(2)}% a.a.
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Parametros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor Inicial (R$)</label>
              <input
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                min={0}
                step={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Aporte Mensal (R$)</label>
              <input
                type="number"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                min={0}
                step={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Periodo</label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <input
                    type="number"
                    value={periodYears}
                    onChange={(e) => setPeriodYears(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    min={0}
                    max={50}
                  />
                  <span className="text-xs text-muted-foreground">anos</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={periodMonths}
                    onChange={(e) => setPeriodMonths(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    min={0}
                    max={11}
                  />
                  <span className="text-xs text-muted-foreground">meses</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Taxa Anual (%)</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                {RATE_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handlePresetChange(preset.key)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedPreset === preset.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-accent'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={annualRate}
                onChange={(e) => {
                  setAnnualRate(Number(e.target.value) || 0)
                  setSelectedPreset('custom')
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                min={0}
                max={100}
                step={0.1}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inflation"
                checked={considerInflation}
                onChange={(e) => setConsiderInflation(e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="inflation" className="text-sm">
                Descontar inflacao (IPCA: {marketRates.ipca.toFixed(2)}%)
              </label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button onClick={handleSimulate} className="w-full" disabled={totalMonths <= 0}>
                <Calculator className="h-4 w-4 mr-2" />
                Simular
              </Button>
              <Button onClick={handleCompare} variant="outline" className="w-full" disabled={totalMonths <= 0}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Comparar Cenarios
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result && !showComparison && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Total Investido</p>
                  <p className="text-sm sm:text-base font-bold mt-1">
                    {formatCurrency(result.totalInvested)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Rendimento</p>
                  <p className="text-sm sm:text-base font-bold text-success mt-1">
                    {formatCurrency(result.totalEarnings)}
                  </p>
                </Card>
                <Card className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Valor Final</p>
                  <p className="text-sm sm:text-base font-bold text-primary mt-1">
                    {formatCurrency(result.finalAmount)}
                  </p>
                </Card>
                {result.realFinalAmount !== undefined && (
                  <Card className="p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground">Valor Real (s/ inflacao)</p>
                    <p className="text-sm sm:text-base font-bold text-warning mt-1">
                      {formatCurrency(result.realFinalAmount)}
                    </p>
                  </Card>
                )}
              </div>

              {/* Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4 text-primary" />
                    Evolucao do Patrimonio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(value: unknown) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="invested"
                        name="Investido"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total c/ Rendimentos"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Yearly Table */}
              {yearlyTable.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Resumo Ano a Ano
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Ano</th>
                            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Investido</th>
                            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Total</th>
                            <th className="text-right py-2 pl-2 font-medium text-muted-foreground">Rendimento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyTable.map((row) => (
                            <tr key={row.month} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">Ano {row.month / 12}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(row.invested)}</td>
                              <td className="py-2 px-2 text-right font-semibold text-primary">{formatCurrency(row.total)}</td>
                              <td className="py-2 pl-2 text-right text-success">{formatCurrency(row.earnings)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Comparison Mode */}
          {showComparison && comparisonResults.length > 0 && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Comparacao de Cenarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={comparisonChartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(value: unknown) => formatCurrency(Number(value))} />
                      <Legend />
                      {comparisonResults.map((r) => (
                        <Line
                          key={r.label}
                          type="monotone"
                          dataKey={r.label}
                          stroke={r.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {comparisonResults.map((r) => (
                  <Card key={r.label} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="font-semibold text-sm">{r.label}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{r.rate.toFixed(2)}% a.a.</Badge>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(r.finalAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Rendimento: {formatCurrency(r.finalAmount - (initialAmount + monthlyDeposit * totalMonths))}
                    </p>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!result && !showComparison && (
            <Card className="flex flex-col items-center justify-center py-16">
              <Calculator className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                Preencha os parametros e clique em <strong>Simular</strong> para ver os resultados.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1 flex items-center gap-1">
                Ou compare cenarios <ArrowRight className="h-3 w-3" /> Poupanca vs CDI vs Selic
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
