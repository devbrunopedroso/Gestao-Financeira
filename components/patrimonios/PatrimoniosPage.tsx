'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useHideValues } from '@/hooks/useHideValues'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/ui/select-native'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatCard } from '@/components/ui/StatCard'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/helpers'
import {
  Building2, Plus, Home, Car, TrendingUp, Package,
  Pencil, Trash2, CheckCircle2, ChevronDown, ChevronUp,
  PieChart as PieChartIcon, Target, BarChart3,
  PiggyBank, Landmark, BadgeDollarSign, BarChart2,
  Bitcoin, Shield, Eye, EyeOff,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Home; color: string }> = {
  IMOVEL: { label: 'Imóvel', icon: Home, color: 'bg-blue-100 text-blue-700' },
  VEICULO: { label: 'Veículo', icon: Car, color: 'bg-green-100 text-green-700' },
  POUPANCA: { label: 'Poupança', icon: PiggyBank, color: 'bg-emerald-100 text-emerald-700' },
  TESOURO_DIRETO: { label: 'Tesouro Direto', icon: Landmark, color: 'bg-amber-100 text-amber-700' },
  RENDA_FIXA: { label: 'Renda Fixa', icon: BadgeDollarSign, color: 'bg-sky-100 text-sky-700' },
  FUNDOS_IMOBILIARIOS: { label: 'Fundos Imobiliários', icon: Building2, color: 'bg-indigo-100 text-indigo-700' },
  ACOES: { label: 'Ações', icon: BarChart2, color: 'bg-rose-100 text-rose-700' },
  CRIPTOMOEDAS: { label: 'Criptomoedas', icon: Bitcoin, color: 'bg-orange-100 text-orange-700' },
  PREVIDENCIA: { label: 'Previdência', icon: Shield, color: 'bg-teal-100 text-teal-700' },
  INVESTIMENTO: { label: 'Investimento', icon: TrendingUp, color: 'bg-purple-100 text-purple-700' },
  OUTRO: { label: 'Outro', icon: Package, color: 'bg-gray-100 text-gray-700' },
}

const CATEGORY_COLORS: Record<string, string> = {
  IMOVEL: '#3B82F6',
  VEICULO: '#22C55E',
  POUPANCA: '#10B981',
  TESOURO_DIRETO: '#F59E0B',
  RENDA_FIXA: '#0EA5E9',
  FUNDOS_IMOBILIARIOS: '#6366F1',
  ACOES: '#F43F5E',
  CRIPTOMOEDAS: '#F97316',
  PREVIDENCIA: '#14B8A6',
  INVESTIMENTO: '#A855F7',
  OUTRO: '#6B7280',
}

// Alocacao ideal baseada em perfil moderado brasileiro (Selic ~13-14%, 2025-2026)
// Fontes: XP, Suno, Toro, InfoMoney - recomendacoes para perfil moderado
const IDEAL_ALLOCATION: Record<string, { label: string; pct: number; desc: string }> = {
  RENDA_FIXA: { label: 'Renda Fixa', pct: 20, desc: 'CDB, LCI, LCA, debentures - base segura do portfólio' },
  TESOURO_DIRETO: { label: 'Tesouro Direto', pct: 15, desc: 'Títulos públicos federais - máxima segurança' },
  ACOES: { label: 'Ações', pct: 15, desc: 'Renda variável - potencial de crescimento a longo prazo' },
  IMOVEL: { label: 'Imóveis', pct: 15, desc: 'Imóveis próprios ou para aluguel' },
  FUNDOS_IMOBILIARIOS: { label: 'Fundos Imobiliários', pct: 10, desc: 'FIIs - renda passiva com dividendos mensais' },
  PREVIDENCIA: { label: 'Previdência', pct: 10, desc: 'PGBL/VGBL - planejamento de aposentadoria' },
  POUPANCA: { label: 'Poupança', pct: 5, desc: 'Reserva de emergência - liquidez imediata' },
  CRIPTOMOEDAS: { label: 'Criptomoedas', pct: 5, desc: 'Bitcoin, Ethereum - alto risco, alta volatilidade' },
  VEICULO: { label: 'Veículos', pct: 5, desc: 'Bem depreciativo - minimizar exposição' },
  INVESTIMENTO: { label: 'Investimento (geral)', pct: 0, desc: 'Categoria legada - reclassifique seus ativos' },
  OUTRO: { label: 'Outros', pct: 0, desc: 'Outros bens e ativos diversos' },
}

interface AssetItem {
  id: string
  name: string
  description: string | null
  estimatedValue: number
  status: 'QUITADO' | 'EM_ANDAMENTO'
  category: string
  yieldRate: number | null
  endDate: string | null
  piggyBank: {
    id: string
    targetAmount: number
    currentAmount: number
    monthlyContribution: number | null
    progress: number
  } | null
}

function calcProjections(asset: AssetItem) {
  const rate = asset.yieldRate
  if (!rate || rate <= 0) return null

  const monthlyRate = rate / 100 / 12
  const isImovel = asset.category === 'IMOVEL'

  if (isImovel) {
    const baseValue = asset.status === 'QUITADO'
      ? asset.estimatedValue
      : (asset.piggyBank?.currentAmount ?? 0)
    return {
      type: 'rental' as const,
      monthlyIncome: baseValue * (rate / 100 / 12),
      annualIncome: baseValue * (rate / 100),
      baseValue,
    }
  }

  // Investimento - juros compostos
  const currentValue = asset.status === 'QUITADO'
    ? asset.estimatedValue
    : (asset.piggyBank?.currentAmount ?? 0)
  const monthlyContribution = asset.piggyBank?.monthlyContribution ?? 0

  const calcFV = (months: number) => {
    if (monthlyRate === 0) return currentValue + (monthlyContribution * months)
    const compoundGrowth = currentValue * Math.pow(1 + monthlyRate, months)
    const contributionGrowth = monthlyContribution > 0
      ? monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate
      : 0
    return compoundGrowth + contributionGrowth
  }

  const periods = [
    { label: '6 meses', months: 6 },
    { label: '1 ano', months: 12 },
    { label: '2 anos', months: 24 },
    { label: '5 anos', months: 60 },
  ]

  const projections = periods.map(p => ({
    label: p.label,
    value: calcFV(p.months),
  }))

  // Se tem data final, calcular projeção até essa data
  let endDateProjection: { label: string; value: number } | null = null
  if (asset.endDate) {
    const end = new Date(asset.endDate)
    const now = new Date()
    const monthsToEnd = Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()))
    if (monthsToEnd > 0) {
      endDateProjection = {
        label: `Em ${end.toLocaleDateString('pt-BR')}`,
        value: calcFV(monthsToEnd),
      }
    }
  }

  return {
    type: 'investment' as const,
    currentValue,
    projections,
    endDateProjection,
  }
}

export function PatrimoniosPage() {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedProjections, setExpandedProjections] = useState<Set<string>>(new Set())
  const { hideValues, toggleHideValues } = useHideValues(selectedAccountId)

  const mask = (value: number) => hideValues ? '••••••' : formatCurrency(value)

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formStatus, setFormStatus] = useState<'QUITADO' | 'EM_ANDAMENTO'>('EM_ANDAMENTO')
  const [formCategory, setFormCategory] = useState('OUTRO')
  const [formMonthlyPayment, setFormMonthlyPayment] = useState('')
  const [formYieldRate, setFormYieldRate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formRateType, setFormRateType] = useState<'anual' | 'mensal'>('anual')

  // Taxas de mercado BCB
  const [marketRates, setMarketRates] = useState<{
    selic: { value: string; date: string } | null
    cdi: { value: string; date: string } | null
    ipca: { value: string; date: string } | null
  } | null>(null)
  const [ratesFailed, setRatesFailed] = useState(false)
  const [manualRates, setManualRates] = useState({ selic: '', cdi: '', ipca: '' })
  const [showManualRates, setShowManualRates] = useState(false)

  const fetchAssets = useCallback(async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/assets?accountId=${selectedAccountId}`)
      if (res.ok) setAssets(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  // Fetch taxas do mercado (BCB) uma vez
  useEffect(() => {
    fetch('/api/market-rates')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && (data.selic || data.cdi || data.ipca)) {
          setMarketRates(data)
          setRatesFailed(false)
        } else {
          setRatesFailed(true)
        }
      })
      .catch(() => { setRatesFailed(true) })
  }, [])

  const toggleProjection = (id: string) => {
    setExpandedProjections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const NON_YIELD_CATEGORIES = ['VEICULO', 'OUTRO']
  const showYieldFields = !NON_YIELD_CATEGORIES.includes(formCategory)

  const openCreate = () => {
    setEditingId(null); setFormError('')
    setFormName(''); setFormDescription(''); setFormValue('')
    setFormStatus('EM_ANDAMENTO'); setFormCategory('OUTRO'); setFormMonthlyPayment('')
    setFormYieldRate(''); setFormRateType('anual'); setFormEndDate('')
    setModalOpen(true)
  }

  const openEdit = (asset: AssetItem) => {
    setEditingId(asset.id); setFormError('')
    setFormName(asset.name)
    setFormDescription(asset.description || '')
    setFormValue(String(asset.estimatedValue))
    setFormStatus(asset.status)
    setFormCategory(asset.category)
    setFormMonthlyPayment(
      asset.piggyBank?.monthlyContribution != null
        ? String(asset.piggyBank.monthlyContribution)
        : ''
    )
    setFormYieldRate(asset.yieldRate != null ? String(asset.yieldRate) : '')
    setFormRateType('anual')
    setFormEndDate(asset.endDate ? asset.endDate.split('T')[0] : '')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName || !formValue) return
    setSaving(true)
    setFormError('')
    try {
      const url = editingId ? `/api/assets/${editingId}` : '/api/assets'
      const method = editingId ? 'PUT' : 'POST'
      let yieldRateToSave = showYieldFields && formYieldRate ? Number(formYieldRate) : null
      if (yieldRateToSave && formRateType === 'mensal') {
        yieldRateToSave = Math.round((Math.pow(1 + yieldRateToSave / 100, 12) - 1) * 10000) / 100
      }
      const body: any = {
        name: formName,
        description: formDescription || undefined,
        estimatedValue: Number(formValue),
        status: formStatus,
        category: formCategory,
        accountId: selectedAccountId,
        monthlyPayment: formStatus === 'EM_ANDAMENTO' && formMonthlyPayment
          ? Number(formMonthlyPayment)
          : null,
        yieldRate: yieldRateToSave,
        endDate: showYieldFields && formStatus === 'EM_ANDAMENTO' && formEndDate
          ? formEndDate
          : null,
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false); fetchAssets()
      } else {
        const data = await res.json()
        setFormError(data.message || 'Erro ao salvar patrimônio')
      }
    } catch (error) {
      console.error('Erro:', error)
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este patrimônio?')) return
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      if (res.ok) fetchAssets()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleMarkQuitado = async (asset: AssetItem) => {
    if (!confirm(`Marcar "${asset.name}" como quitado?`)) return
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'QUITADO' }),
      })
      if (res.ok) fetchAssets()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const emAndamento = assets.filter(a => a.status === 'EM_ANDAMENTO')
  const quitados = assets.filter(a => a.status === 'QUITADO')

  const totalPatrimonio = assets.reduce((sum, a) => {
    if (a.status === 'QUITADO') return sum + a.estimatedValue
    if (a.piggyBank) return sum + a.piggyBank.currentAmount
    return sum
  }, 0)

  const getAssetValue = (a: AssetItem) =>
    a.status === 'QUITADO' ? a.estimatedValue : (a.piggyBank?.currentAmount ?? 0)

  const categoryDistribution = useMemo(() => {
    const totals: Record<string, number> = {}
    assets.forEach(a => {
      totals[a.category] = (totals[a.category] || 0) + getAssetValue(a)
    })
    return Object.entries(totals)
      .map(([category, value]) => ({
        name: CATEGORY_LABELS[category]?.label || category,
        value,
        category,
      }))
      .filter(d => d.value > 0)
  }, [assets])

  const projectionData = useMemo(() => {
    if (assets.length === 0) return []
    const periods = [0, 6, 12, 24, 36, 60]
    return periods.map(m => {
      let total = 0
      assets.forEach(asset => {
        const currentValue = getAssetValue(asset)
        const rate = asset.yieldRate
        if (!rate || rate <= 0 || asset.category === 'IMOVEL') {
          total += currentValue
          return
        }
        const monthlyRate = rate / 100 / 12
        const monthlyContribution = asset.piggyBank?.monthlyContribution ?? 0
        if (monthlyRate === 0) {
          total += currentValue + (monthlyContribution * m)
        } else {
          const compound = currentValue * Math.pow(1 + monthlyRate, m)
          const contrib = monthlyContribution > 0
            ? monthlyContribution * (Math.pow(1 + monthlyRate, m) - 1) / monthlyRate
            : 0
          total += compound + contrib
        }
      })
      return {
        label: m === 0 ? 'Hoje' : m < 12 ? `${m}m` : `${m / 12}a`,
        total,
      }
    })
  }, [assets])

  const renderProjection = (asset: AssetItem) => {
    const proj = calcProjections(asset)
    if (!proj) return null

    const isExpanded = expandedProjections.has(asset.id)

    return (
      <>
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs gap-1"
          onClick={() => toggleProjection(asset.id)}
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {isExpanded ? 'Ocultar projeção' : 'Ver projeção'}
        </Button>
        {isExpanded && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Rendimento: {asset.yieldRate}% a.a.
            </p>
            {proj.type === 'rental' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Renda mensal</span>
                  <p className="font-semibold text-success">{mask(proj.monthlyIncome)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Renda anual</span>
                  <p className="font-semibold text-success">{mask(proj.annualIncome)}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {proj.endDateProjection && (
                  <div className="flex justify-between text-xs border-b pb-1.5 mb-1">
                    <span className="font-medium text-primary">{proj.endDateProjection.label}</span>
                    <span className="font-bold text-primary">{mask(proj.endDateProjection.value)}</span>
                  </div>
                )}
                {proj.projections.map((p) => (
                  <div key={p.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="font-semibold">{mask(p.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Patrimônios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Seus bens e patrimônios</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleHideValues} className="text-muted-foreground" title={hideValues ? 'Mostrar valores' : 'Esconder valores'}>
            {hideValues ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
          <Button onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Novo Patrimônio
          </Button>
        </div>
      </div>

      <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />

      {/* Total */}
      {!loading && assets.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Patrimonio total acumulado</span>
              <span className="text-lg font-bold text-primary">{mask(totalPatrimonio)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[200px]" />)}
        </div>
      ) : assets.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum patrimonio</h3>
            <p className="text-sm text-muted-foreground">Adicione seus bens para acompanhar seu patrimonio.</p>
            <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> Adicionar Patrimonio</Button>
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="patrimonios" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="patrimonios" className="flex-1 sm:flex-initial gap-1">
              <Building2 className="h-4 w-4 hidden sm:inline" />
              Patrimonios
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-initial gap-1">
              <PieChartIcon className="h-4 w-4 hidden sm:inline" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="ideal" className="flex-1 sm:flex-initial gap-1">
              <Target className="h-4 w-4 hidden sm:inline" />
              Ideal
            </TabsTrigger>
            <TabsTrigger value="projecao" className="flex-1 sm:flex-initial gap-1">
              <BarChart3 className="h-4 w-4 hidden sm:inline" />
              Projecao
            </TabsTrigger>
          </TabsList>

          {/* TAB: Patrimonios */}
          <TabsContent value="patrimonios" className="space-y-4">
            {/* Em Andamento */}
            {emAndamento.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Em Andamento
                  <Badge variant="secondary">{emAndamento.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {emAndamento.map(asset => {
                    const cat = CATEGORY_LABELS[asset.category] || CATEGORY_LABELS.OUTRO
                    const CatIcon = cat.icon
                    const monthlyRate = asset.yieldRate ? ((Math.pow(1 + asset.yieldRate / 100, 1/12) - 1) * 100) : 0
                    return (
                      <Card key={asset.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg truncate">{asset.name}</CardTitle>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(asset)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(asset.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`gap-1 text-xs ${cat.color}`}>
                              <CatIcon className="h-3 w-3" />
                              {cat.label}
                            </Badge>
                            {asset.yieldRate != null && asset.yieldRate > 0 && (
                              <Badge variant="outline" className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {asset.yieldRate}% a.a. ({monthlyRate.toFixed(2)}% a.m.)
                              </Badge>
                            )}
                          </div>
                          {asset.description && <p className="text-xs text-muted-foreground">{asset.description}</p>}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {asset.piggyBank && (
                            <>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Progresso</span>
                                  <span className="font-semibold">{asset.piggyBank.progress}%</span>
                                </div>
                                <Progress
                                  value={asset.piggyBank.progress}
                                  className="h-2"
                                  indicatorClassName={asset.piggyBank.progress >= 100 ? 'bg-success' : 'bg-primary'}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Pago</span>
                                  <p className="font-semibold">{mask(asset.piggyBank.currentAmount)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Valor total</span>
                                  <p className="font-semibold">{mask(asset.estimatedValue)}</p>
                                </div>
                                {asset.piggyBank.monthlyContribution != null && asset.piggyBank.monthlyContribution > 0 && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Aporte mensal</span>
                                    <p className="font-semibold text-destructive">{mask(asset.piggyBank.monthlyContribution)}</p>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                          {renderProjection(asset)}
                          <Separator />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs gap-1 border-success/50 text-success hover:text-success"
                            onClick={() => handleMarkQuitado(asset)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como Quitado
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quitados */}
            {quitados.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Quitados
                  <Badge variant="secondary">{quitados.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quitados.map(asset => {
                    const cat = CATEGORY_LABELS[asset.category] || CATEGORY_LABELS.OUTRO
                    const CatIcon = cat.icon
                    const monthlyRate = asset.yieldRate ? ((Math.pow(1 + asset.yieldRate / 100, 1/12) - 1) * 100) : 0
                    return (
                      <Card key={asset.id} className="hover:shadow-md transition-shadow border-success/30">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg truncate">{asset.name}</CardTitle>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(asset)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(asset.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`gap-1 text-xs ${cat.color}`}>
                              <CatIcon className="h-3 w-3" />
                              {cat.label}
                            </Badge>
                            <Badge variant="outline" className="gap-1 text-xs bg-success/10 text-success border-success/30">
                              <CheckCircle2 className="h-3 w-3" />
                              Quitado
                            </Badge>
                            {asset.yieldRate != null && asset.yieldRate > 0 && (
                              <Badge variant="outline" className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {asset.yieldRate}% a.a. ({monthlyRate.toFixed(2)}% a.m.)
                              </Badge>
                            )}
                          </div>
                          {asset.description && <p className="text-xs text-muted-foreground mt-1">{asset.description}</p>}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Valor estimado</span>
                            <p className="font-semibold text-lg">{mask(asset.estimatedValue)}</p>
                          </div>
                          {renderProjection(asset)}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB: Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(CATEGORY_LABELS)
                .map(([key, cat]) => ({
                  key,
                  cat,
                  total: assets.filter(a => a.category === key).reduce((s, a) => s + getAssetValue(a), 0),
                }))
                .filter(item => item.total > 0)
                .map(({ key, cat, total }) => (
                  <StatCard key={key} title={cat.label} value={total} icon={cat.icon} variant="default" hidden={hideValues} />
                ))}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Distribuicao por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryDistribution.length === 0 ? (
                  <div className="text-center py-8">
                    <PieChartIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum patrimonio com valor cadastrado</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-1/2">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={categoryDistribution}
                            cx="50%" cy="50%"
                            innerRadius={50} outerRadius={90}
                            dataKey="value"
                            label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {categoryDistribution.map((entry) => (
                              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#6B7280'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: unknown) => mask(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 w-full sm:w-1/2">
                      {categoryDistribution.map(entry => {
                        const pct = totalPatrimonio > 0 ? (entry.value / totalPatrimonio) * 100 : 0
                        return (
                          <div key={entry.category} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: CATEGORY_COLORS[entry.category] || '#6B7280' }} />
                                <span className="font-medium">{entry.name}</span>
                              </div>
                              <span className="text-muted-foreground text-xs">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <Progress value={pct} className="h-1.5 flex-1 mr-2" />
                              <span className="font-semibold text-xs shrink-0">{mask(entry.value)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Taxas de mercado BCB */}
            {(marketRates && (marketRates.selic || marketRates.cdi || marketRates.ipca)) ? (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Taxas de Mercado (BCB)</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowManualRates(!showManualRates)}>
                      {showManualRates ? 'Ocultar' : 'Editar'}
                    </Button>
                  </div>
                  {showManualRates ? (
                    <div className="grid grid-cols-3 gap-3">
                      {(['selic', 'cdi', 'ipca'] as const).map(key => (
                        <div key={key} className="space-y-1">
                          <p className="text-xs text-muted-foreground text-center">{key.toUpperCase()}</p>
                          <Input
                            type="number" step="0.01" className="text-center h-8 text-sm"
                            placeholder={marketRates?.[key]?.value || '0'}
                            value={manualRates[key]}
                            onChange={e => {
                              const val = e.target.value
                              setManualRates(prev => ({ ...prev, [key]: val }))
                              if (val) {
                                setMarketRates(prev => prev ? {
                                  ...prev,
                                  [key]: { value: val, date: 'Manual' },
                                } : prev)
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {marketRates.selic && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Selic</p>
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{Number(marketRates.selic.value).toFixed(2)}%</p>
                          <p className="text-[10px] text-muted-foreground">{marketRates.selic.date}</p>
                        </div>
                      )}
                      {marketRates.cdi && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">CDI</p>
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{Number(marketRates.cdi.value).toFixed(2)}%</p>
                          <p className="text-[10px] text-muted-foreground">{marketRates.cdi.date}</p>
                        </div>
                      )}
                      {marketRates.ipca && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">IPCA</p>
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{Number(marketRates.ipca.value).toFixed(2)}%</p>
                          <p className="text-[10px] text-muted-foreground">{marketRates.ipca.date}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : ratesFailed ? (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Taxas de Mercado (manual)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">API do BCB indisponivel. Informe as taxas manualmente:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['selic', 'cdi', 'ipca'] as const).map(key => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-muted-foreground text-center">{key.toUpperCase()} (%)</p>
                        <Input
                          type="number" step="0.01" className="text-center h-8 text-sm"
                          placeholder="0.00"
                          value={manualRates[key]}
                          onChange={e => {
                            const val = e.target.value
                            setManualRates(prev => ({ ...prev, [key]: val }))
                            if (val) {
                              setMarketRates(prev => ({
                                ...(prev || { selic: null, cdi: null, ipca: null }),
                                [key]: { value: val, date: 'Manual' },
                              }))
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Rendimento estimado mensal */}
            {(() => {
              const monthlyYield = assets.reduce((sum, a) => {
                if (!a.yieldRate || a.yieldRate <= 0) return sum
                const val = getAssetValue(a)
                if (a.category === 'IMOVEL') return sum + val * (a.yieldRate / 100 / 12)
                const monthlyRate = a.yieldRate / 100 / 12
                return sum + val * monthlyRate
              }, 0)
              if (monthlyYield <= 0) return null
              return (
                <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Rendimento mensal estimado</p>
                        <p className="text-xs text-muted-foreground">Baseado nos rendimentos configurados</p>
                      </div>
                      <span className="text-lg font-bold text-purple-700 dark:text-purple-400">{mask(monthlyYield)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </TabsContent>

          {/* TAB: Alocacao Ideal */}
          <TabsContent value="ideal" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Sua Alocacao vs Alocacao Ideal
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Alocacao ideal para perfil moderado (Selic ~13-14%). Baseado em recomendacoes de XP, Suno, Toro e InfoMoney. Os percentuais sao referencias gerais e podem variar conforme seu perfil de investidor e momento economico.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(IDEAL_ALLOCATION)
                  .filter(([key, ideal]) => {
                    // Mostrar se tem % ideal > 0, ou se o usuario tem patrimonio nessa categoria
                    const hasAssets = categoryDistribution.some(c => c.category === key)
                    return ideal.pct > 0 || hasAssets
                  })
                  .map(([key, ideal]) => {
                  const actual = totalPatrimonio > 0
                    ? ((categoryDistribution.find(c => c.category === key)?.value ?? 0) / totalPatrimonio) * 100
                    : 0
                  const diff = actual - ideal.pct
                  const catLabel = CATEGORY_LABELS[key]
                  const CatIcon = catLabel?.icon || Package
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
                          <CatIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{ideal.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Ideal: {ideal.pct}%</span>
                          <span className={`font-semibold ${Math.abs(diff) <= 5 ? 'text-success' : diff < -5 ? 'text-destructive' : 'text-amber-600'}`}>
                            Atual: {actual.toFixed(1)}%
                          </span>
                          {totalPatrimonio > 0 && (
                            <Badge variant={Math.abs(diff) <= 5 ? 'success' : 'outline'} className="text-xs">
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="relative">
                          <Progress value={ideal.pct} className="h-2.5" indicatorClassName="bg-muted-foreground/20" />
                        </div>
                        <div className="relative">
                          <Progress
                            value={Math.min(actual, 100)}
                            className="h-2.5"
                            indicatorClassName={Math.abs(diff) <= 5 ? 'bg-success' : diff < -5 ? 'bg-destructive' : 'bg-amber-500'}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{ideal.desc}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">
                  <strong>Dica:</strong> A diversificacao e uma das melhores estrategias para proteger seu patrimonio. Procure distribuir seus investimentos entre diferentes classes de ativos (renda fixa, imoveis, renda variavel). Consulte um assessor financeiro para personalizar a alocacao ideal ao seu perfil de risco.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Projecao Geral */}
          <TabsContent value="projecao" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Projecao Geral do Patrimonio
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Crescimento estimado considerando rendimentos e aportes mensais de todos os patrimonios.
                </p>
              </CardHeader>
              <CardContent>
                {projectionData.length > 0 && projectionData[0].total > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={projectionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(v) => {
                            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                            if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
                            return String(v)
                          }}
                          width={50}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip formatter={(value: unknown) => mask(Number(value))} />
                        <Line
                          type="monotone" dataKey="total" stroke="#A855F7"
                          strokeWidth={2} dot={{ r: 4 }} name="Patrimonio Total"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {projectionData.filter(p => p.label !== 'Hoje').map(p => (
                        <div key={p.label} className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">{p.label}</p>
                          <p className="font-bold text-sm">{mask(p.total)}</p>
                          {projectionData[0].total > 0 && (
                            <p className="text-xs text-success">
                              +{(((p.total - projectionData[0].total) / projectionData[0].total) * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Adicione patrimonios com rendimento para ver projecoes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Patrimônio' : 'Novo Patrimônio'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Altere os dados do patrimônio.' : 'Adicione um bem ao seu patrimônio.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Apartamento, Carro..." value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input placeholder="Descrição do patrimônio" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor estimado (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={formValue} onChange={(e) => setFormValue(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <NativeSelect value={formCategory} onChange={(e) => {
                  const cat = e.target.value
                  setFormCategory(cat)
                  // Auto-preencher rendimento baseado na categoria
                  if (cat === 'POUPANCA') {
                    // Poupança: Selic > 8.5% → 0.5% a.m. + TR ≈ 6.17% a.a. | Selic ≤ 8.5% → 70% da Selic
                    const selicValue = marketRates?.selic ? Number(marketRates.selic.value) : 0
                    const poupanca = selicValue > 8.5
                      ? ((Math.pow(1.005, 12) - 1) * 100) // 0.5% a.m. ≈ 6.17% a.a.
                      : selicValue * 0.7
                    setFormYieldRate(poupanca.toFixed(2))
                    setFormRateType('anual')
                  } else if (cat === 'TESOURO_DIRETO') {
                    const selicValue = marketRates?.selic ? Number(marketRates.selic.value) : 0
                    setFormYieldRate(selicValue.toFixed(2))
                    setFormRateType('anual')
                  } else if (cat === 'RENDA_FIXA' || cat === 'PREVIDENCIA') {
                    const cdiValue = marketRates?.cdi ? Number(marketRates.cdi.value) : 0
                    setFormYieldRate(cdiValue.toFixed(2))
                    setFormRateType('anual')
                  }
                }}>
                  <optgroup label="Renda Fixa">
                    <option value="POUPANCA">Poupança</option>
                    <option value="TESOURO_DIRETO">Tesouro Direto</option>
                    <option value="RENDA_FIXA">Renda Fixa (CDB, LCI, LCA)</option>
                    <option value="PREVIDENCIA">Previdência Privada</option>
                  </optgroup>
                  <optgroup label="Renda Variável">
                    <option value="ACOES">Ações</option>
                    <option value="FUNDOS_IMOBILIARIOS">Fundos Imobiliários</option>
                    <option value="CRIPTOMOEDAS">Criptomoedas</option>
                  </optgroup>
                  <optgroup label="Bens">
                    <option value="IMOVEL">Imóvel</option>
                    <option value="VEICULO">Veículo</option>
                  </optgroup>
                  <optgroup label="Outros">
                    <option value="INVESTIMENTO">Investimento (geral)</option>
                    <option value="OUTRO">Outro</option>
                  </optgroup>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <NativeSelect value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)}>
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="QUITADO">Quitado</option>
                </NativeSelect>
              </div>
            </div>
            {formStatus === 'EM_ANDAMENTO' && (
              <div className="space-y-2">
                <Label>Aporte mensal (R$)</Label>
                <p className="text-xs text-muted-foreground">Valor da parcela mensal. Será contabilizado como despesa fixa.</p>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={formMonthlyPayment} onChange={(e) => setFormMonthlyPayment(e.target.value)} />
              </div>
            )}
            {showYieldFields && (
              <>
                <div className="space-y-2">
                  <Label>Rendimento ({formRateType === 'anual' ? 'anual' : 'mensal'}) (%)</Label>
                  <p className="text-xs text-muted-foreground">
                    {formCategory === 'IMOVEL'
                      ? 'Ex: rendimento com aluguel sobre o valor'
                      : formCategory === 'POUPANCA' ? 'Rendimento da poupança (~6-7% a.a.)'
                      : formCategory === 'TESOURO_DIRETO' ? 'Ex: Selic, IPCA+, prefixado'
                      : formCategory === 'RENDA_FIXA' ? 'Ex: CDB 100% CDI, LCI, LCA'
                      : formCategory === 'ACOES' ? 'Estimativa de retorno anual médio'
                      : formCategory === 'FUNDOS_IMOBILIARIOS' ? 'Dividend yield médio dos FIIs'
                      : formCategory === 'CRIPTOMOEDAS' ? 'Estimativa de rendimento (alta volatilidade)'
                      : formCategory === 'PREVIDENCIA' ? 'Rentabilidade do plano PGBL/VGBL'
                      : 'Taxa de rendimento esperada'}
                  </p>
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" min="0" placeholder="0,00" value={formYieldRate} onChange={(e) => setFormYieldRate(e.target.value)} className="flex-1" />
                    <div className="flex rounded-md border overflow-hidden shrink-0">
                      <Button
                        type="button" size="sm"
                        variant={formRateType === 'mensal' ? 'default' : 'ghost'}
                        className="text-xs px-2.5 rounded-none h-10"
                        onClick={() => {
                          if (formRateType !== 'mensal' && formYieldRate) {
                            const annual = Number(formYieldRate)
                            const monthly = (Math.pow(1 + annual / 100, 1/12) - 1) * 100
                            setFormYieldRate(monthly.toFixed(2))
                          }
                          setFormRateType('mensal')
                        }}
                      >a.m.</Button>
                      <Button
                        type="button" size="sm"
                        variant={formRateType === 'anual' ? 'default' : 'ghost'}
                        className="text-xs px-2.5 rounded-none h-10"
                        onClick={() => {
                          if (formRateType !== 'anual' && formYieldRate) {
                            const monthly = Number(formYieldRate)
                            const annual = (Math.pow(1 + monthly / 100, 12) - 1) * 100
                            setFormYieldRate(annual.toFixed(2))
                          }
                          setFormRateType('anual')
                        }}
                      >a.a.</Button>
                    </div>
                  </div>
                </div>
                {formStatus === 'EM_ANDAMENTO' && (
                  <div className="space-y-2">
                    <Label>Data final (opcional)</Label>
                    <p className="text-xs text-muted-foreground">Data de vencimento ou objetivo. Gera estimativa até essa data.</p>
                    <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
                  </div>
                )}
              </>
            )}
          </div>
          {formError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{formError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName || !formValue}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
