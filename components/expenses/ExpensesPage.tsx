'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import { MonthNavigator } from '@/components/ui/MonthNavigator'
import { StatCard } from '@/components/ui/StatCard'
import { NativeSelect } from '@/components/ui/select-native'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/helpers'
import { Textarea } from '@/components/ui/textarea'
import {
  Receipt, Plus, Pencil, Trash2, TrendingDown, CalendarClock, Zap,
  RotateCcw, Clock, Send, CreditCard, Upload, X, Check,
} from 'lucide-react'

interface VariableExpense {
  id: string; amount: number; description: string | null; date: string
  category?: { id: string; name: string; color: string | null; icon: string | null } | null
}
interface FixedExpense {
  id: string; amount: number; description: string; startDate: string; endDate: string | null
  category?: { id: string; name: string; color: string | null; icon: string | null } | null
}
interface Category { id: string; name: string; icon: string | null; isDefault?: boolean }

export function ExpensesPage() {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [fixedImpact, setFixedImpact] = useState(0)
  const [loading, setLoading] = useState(true)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'variable' | 'fixed'>('variable')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formEndDate, setFormEndDate] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [continueAdding, setContinueAdding] = useState(false)

  // Quick expense inline
  const [quickAmount, setQuickAmount] = useState('')
  const [quickDescription, setQuickDescription] = useState('')
  const [quickCategoryId, setQuickCategoryId] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickSuccess, setQuickSuccess] = useState(false)

  // Invoice import modal
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [invoiceText, setInvoiceText] = useState('')
  const [parsedItems, setParsedItems] = useState<Array<{
    date: string; description: string; cardholder: string; amount: number; installment: string; card: string; selected: boolean; duplicate?: boolean
  }>>([])
  const [invoiceSaving, setInvoiceSaving] = useState(false)
  const [invoiceParsing, setInvoiceParsing] = useState(false)
  const [invoiceBank, setInvoiceBank] = useState('')
  const [cardholderFilter, setCardholderFilter] = useState('all')

  const fetchAll = useCallback(async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const [varRes, fixedRes, catRes, impactRes] = await Promise.all([
        fetch(`/api/expenses/variable?accountId=${selectedAccountId}&month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/expenses/fixed?accountId=${selectedAccountId}`),
        fetch(`/api/categories?accountId=${selectedAccountId}`),
        fetch(`/api/expenses/fixed/monthly-impact?accountId=${selectedAccountId}&month=${currentMonth}&year=${currentYear}`),
      ])
      if (varRes.ok) {
        const data = await varRes.json()
        setVariableExpenses(data.map((e: any) => ({ ...e, amount: Number(e.amount) })))
      }
      if (fixedRes.ok) {
        const data = await fixedRes.json()
        setFixedExpenses(data.map((e: any) => ({ ...e, amount: Number(e.amount) })))
      }
      if (catRes.ok) {
        const data = await catRes.json()
        // Mark default categories so we can auto-create them when used
        const defaults = (data.default || []).map((c: any) => ({ ...c, isDefault: true }))
        const custom = (data.custom || []).map((c: any) => ({ ...c, isDefault: false }))
        setCategories([...custom, ...defaults])
      }
      if (impactRes.ok) {
        const data = await impactRes.json()
        setFixedImpact(data.total || 0)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId, currentMonth, currentYear])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Resolve category ID - if it's a default category, create it in DB first
  const resolveCategoryId = async (catId: string): Promise<string | undefined> => {
    if (!catId) return undefined
    const cat = categories.find(c => c.id === catId)
    if (!cat || !cat.isDefault) return catId

    // Auto-create the default category as a real DB record
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cat.name,
          icon: cat.icon,
          color: (cat as any).color || null,
          accountId: selectedAccountId,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        return created.id
      } else {
        // Category might already exist (race condition), try to find it
        const existingCat = categories.find(c => !c.isDefault && c.name === cat.name)
        if (existingCat) return existingCat.id
      }
    } catch {
      // Fallback: look for an existing custom category with same name
      const existingCat = categories.find(c => !c.isDefault && c.name === cat.name)
      if (existingCat) return existingCat.id
    }
    return undefined
  }

  // Check parsed items against existing expenses (same date + amount = duplicate)
  const markDuplicates = async (items: typeof parsedItems): Promise<typeof parsedItems> => {
    if (!selectedAccountId || items.length === 0) return items

    // Get date range from parsed items
    const dates = items.map(i => i.date).filter(Boolean).sort()
    const minDate = dates[0]
    const maxDate = dates[dates.length - 1]
    if (!minDate) return items

    try {
      // Fetch existing expenses for the date range
      const res = await fetch(
        `/api/expenses/variable?accountId=${selectedAccountId}&startDate=${minDate}&endDate=${maxDate}`
      )
      if (!res.ok) return items

      const existing: Array<{ amount: number; date: string; description?: string }> = (await res.json()).map((e: any) => ({
        amount: Number(e.amount),
        date: e.date?.split('T')[0] || '',
        description: e.description || '',
      }))

      return items.map(item => {
        const isDuplicate = existing.some(exp =>
          exp.date === item.date && Math.abs(exp.amount - item.amount) < 0.01
        )
        return {
          ...item,
          duplicate: isDuplicate,
          selected: isDuplicate ? false : item.selected,
        }
      })
    } catch {
      return items
    }
  }

  const openCreateModal = (type: 'variable' | 'fixed') => {
    setModalType(type)
    setEditingId(null)
    setFormAmount('')
    setFormDescription('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormEndDate('')
    setFormCategoryId('')
    setContinueAdding(false)
    setModalOpen(true)
  }

  const openEditModal = (type: 'variable' | 'fixed', item: VariableExpense | FixedExpense) => {
    setModalType(type)
    setEditingId(item.id)
    setFormAmount(String(item.amount))
    setFormDescription(item.description || '')
    setFormCategoryId(item.category?.id || '')
    if (type === 'variable') {
      setFormDate((item as VariableExpense).date?.split('T')[0] || '')
    } else {
      setFormDate((item as FixedExpense).startDate?.split('T')[0] || '')
      setFormEndDate((item as FixedExpense).endDate?.split('T')[0] || '')
    }
    setModalOpen(true)
  }

  // Re-launch a previous expense (quick duplicate)
  const relaunExpense = (expense: VariableExpense) => {
    setModalType('variable')
    setEditingId(null)
    setFormAmount(String(expense.amount))
    setFormDescription(expense.description || '')
    setFormCategoryId(expense.category?.id || '')
    setFormDate(new Date().toISOString().split('T')[0])
    setContinueAdding(false)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formAmount || Number(formAmount) <= 0) return
    setSaving(true)
    try {
      const resolvedCategoryId = await resolveCategoryId(formCategoryId)
      const isVariable = modalType === 'variable'
      const url = editingId
        ? `/api/expenses/${isVariable ? 'variable' : 'fixed'}/${editingId}`
        : `/api/expenses/${isVariable ? 'variable' : 'fixed'}`
      const method = editingId ? 'PUT' : 'POST'
      const body: any = {
        amount: Number(formAmount),
        description: formDescription || undefined,
        accountId: selectedAccountId,
        categoryId: resolvedCategoryId || undefined,
      }
      if (isVariable) {
        body.date = formDate
      } else {
        body.startDate = formDate
        body.endDate = formEndDate || undefined
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        if (continueAdding && !editingId) {
          setFormAmount('')
          setFormDescription('')
        } else {
          setModalOpen(false)
        }
        fetchAll()
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSaving(false)
    }
  }

  // Quick expense: inline save (today's date, no modal)
  const handleQuickSave = async () => {
    if (!quickAmount || Number(quickAmount) <= 0 || !selectedAccountId) return
    setQuickSaving(true)
    try {
      const resolvedCategoryId = await resolveCategoryId(quickCategoryId)
      const res = await fetch('/api/expenses/variable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(quickAmount),
          description: quickDescription || undefined,
          date: new Date().toISOString().split('T')[0],
          accountId: selectedAccountId,
          categoryId: resolvedCategoryId || undefined,
        }),
      })
      if (res.ok) {
        setQuickAmount('')
        setQuickDescription('')
        setQuickCategoryId('')
        setQuickSuccess(true)
        setTimeout(() => setQuickSuccess(false), 2000)
        fetchAll()
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setQuickSaving(false)
    }
  }

  const handleDelete = async (type: 'variable' | 'fixed', id: string) => {
    if (!confirm('Deseja realmente excluir?')) return
    try {
      const res = await fetch(`/api/expenses/${type}/${id}`, { method: 'DELETE' })
      if (res.ok) fetchAll()
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  // Parse CSV amount like "R$ 123,45" or "R$ -6.004,34"
  const parseBRLAmount = (raw: string): number => {
    const cleaned = raw.replace('R$', '').trim()
    // Handle thousands separator (.) and decimal (,): "6.004,34" -> "6004.34"
    const normalized = cleaned.replace(/\./g, '').replace(',', '.')
    return parseFloat(normalized) || 0
  }

  // Parse CSV or text invoice
  const parseInvoice = async (text: string) => {
    if (!text.trim()) return
    const lines = text.split('\n').filter(l => l.trim())
    type ParsedItem = {
      date: string; description: string; cardholder: string; amount: number; installment: string; card: string; selected: boolean
    }
    const items: ParsedItem[] = []

    // Detect CSV format: check if first line looks like a header with semicolons
    const firstLine = lines[0]?.trim() || ''
    const isCSV = firstLine.includes(';') && (
      firstLine.toLowerCase().includes('data') ||
      firstLine.toLowerCase().includes('estabelecimento') ||
      firstLine.toLowerCase().includes('valor')
    )

    if (isCSV) {
      // Parse CSV with semicolon separator
      const dataLines = lines.slice(1) // skip header
      for (const line of dataLines) {
        const cols = line.split(';').map(c => c.trim())
        if (cols.length < 4) continue

        const dateStr = cols[0] // DD/MM/YYYY
        const description = cols[1] || ''
        const cardholder = cols[2]?.trim() || ''
        const amountStr = cols[3] || '0'
        const installment = cols[4] || '-'

        const amount = parseBRLAmount(amountStr)

        // Skip negative amounts (payments) and zero amounts
        if (amount <= 0) continue

        // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
        const dateParts = dateStr.split('/')
        const isoDate = dateParts.length === 3
          ? `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
          : new Date().toISOString().split('T')[0]

        items.push({
          date: isoDate,
          description,
          cardholder,
          amount,
          installment,
          card: '',
          selected: true,
        })
      }
    } else {
      // Fallback: try text parsing (plain text pasted)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        let description = ''
        let amount = 0

        // Try: "Description    R$ 123,45"
        const match = trimmed.match(/^(.+?)\s+R?\$?\s*(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/)
        if (match) {
          description = match[1].replace(/[-–—;]+\s*$/, '').trim()
          amount = parseBRLAmount(match[2])
        } else {
          description = trimmed
        }

        if (description && amount > 0) {
          items.push({
            date: new Date().toISOString().split('T')[0],
            description,
            cardholder: '',
            amount,
            installment: '-',
            card: '',
            selected: true,
          })
        }
      }
    }

    const checked = await markDuplicates(items)
    setParsedItems(checked)
    setCardholderFilter('all')
  }

  // Handle file upload (CSV client-side, PDF via server API)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.pdf')) {
      // PDF: send to server API for parsing
      setInvoiceParsing(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/invoices/parse', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          setInvoiceBank(data.bank || '')
          const items = (data.transactions || [])
            .filter((t: any) => t.amount > 0)
            .map((t: any) => ({
              date: t.date || new Date().toISOString().split('T')[0],
              description: t.description || '',
              cardholder: t.cardholder || '',
              amount: t.amount,
              installment: t.installment || '-',
              card: t.card || '',
              selected: true,
            }))
          const checked = await markDuplicates(items)
          setParsedItems(checked)
          setCardholderFilter('all')
        } else {
          const err = await res.json().catch(() => ({}))
          alert(err.message || 'Erro ao processar PDF')
        }
      } catch (error) {
        console.error('Erro ao processar PDF:', error)
        alert('Erro ao processar o arquivo PDF')
      } finally {
        setInvoiceParsing(false)
      }
    } else {
      // CSV/TXT: parse client-side
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        if (text) {
          setInvoiceText(text)
          await parseInvoice(text)
        }
      }
      reader.readAsText(file, 'utf-8')
    }
  }

  const toggleInvoiceItem = (index: number) => {
    setParsedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ))
  }

  const updateInvoiceItem = (index: number, field: 'description' | 'amount', value: string) => {
    setParsedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : item
    ))
  }

  const removeInvoiceItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index))
  }

  // Get unique cardholders for filter
  const cardholders = Array.from(new Set(parsedItems.map(i => i.cardholder).filter(Boolean)))

  // Filtered items by cardholder
  const filteredItems = cardholderFilter === 'all'
    ? parsedItems
    : parsedItems.filter(i => i.cardholder === cardholderFilter)

  const handleInvoiceSave = async () => {
    const selectedItems = parsedItems.filter(item => item.selected && item.amount > 0)
    if (selectedItems.length === 0 || !selectedAccountId) return

    setInvoiceSaving(true)
    let successCount = 0

    for (const item of selectedItems) {
      try {
        const desc = item.installment && item.installment !== '-'
          ? `${item.description} (${item.installment})`
          : item.description
        const res = await fetch('/api/expenses/variable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: item.amount,
            description: desc,
            date: item.date,
            accountId: selectedAccountId,
          }),
        })
        if (res.ok) successCount++
      } catch (error) {
        console.error('Erro ao salvar item:', error)
      }
    }

    setInvoiceSaving(false)
    if (successCount > 0) {
      alert(`${successCount} despesa${successCount > 1 ? 's' : ''} lancada${successCount > 1 ? 's' : ''} com sucesso!`)
      setInvoiceOpen(false)
      setInvoiceText('')
      setParsedItems([])
      fetchAll()
    }
  }

  const variableTotal = variableExpenses.reduce((a, b) => a + b.amount, 0)
  const fixedTotal = fixedExpenses.reduce((a, b) => a + Number(b.amount), 0)

  // Get unique recent expenses for quick re-launch (last 5 unique descriptions)
  const recentExpenses = variableExpenses
    .filter(e => e.description)
    .reduce((acc, e) => {
      const key = `${e.description}-${e.amount}-${e.category?.id || ''}`
      if (!acc.find(a => `${a.description}-${a.amount}-${a.category?.id || ''}` === key)) {
        acc.push(e)
      }
      return acc
    }, [] as VariableExpense[])
    .slice(0, 6)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-destructive" />
            Despesas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas despesas fixas e variaveis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setInvoiceText(''); setParsedItems([]); setInvoiceBank(''); setInvoiceOpen(true) }} size="sm" variant="outline" className="gap-1">
            <CreditCard className="h-4 w-4" /> Importar Fatura
          </Button>
          <Button onClick={() => openCreateModal('fixed')} size="sm" variant="outline" className="gap-1">
            <Plus className="h-4 w-4" /> Despesa Fixa
          </Button>
          <Button onClick={() => openCreateModal('variable')} size="sm" variant="destructive" className="gap-1">
            <Zap className="h-4 w-4" /> Lancar Despesa
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />
        <MonthNavigator month={currentMonth} year={currentYear} onMonthChange={(m, y) => { setCurrentMonth(m); setCurrentYear(y) }} />
      </div>

      {selectedAccountId && (
        <>
          {/* Quick Expense Entry - inline fast form */}
          <Card className="border-dashed border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-destructive" />
                Lancamento Rapido
                {quickSuccess && (
                  <Badge variant="success" className="text-xs animate-in fade-in">Salvo!</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Valor"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="sm:w-32"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSave() }}
                />
                <Input
                  placeholder="Descricao (ex: Uber, Mercado...)"
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  className="sm:flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSave() }}
                />
                <NativeSelect
                  value={quickCategoryId}
                  onChange={(e) => setQuickCategoryId(e.target.value)}
                  className="sm:w-40"
                >
                  <option value="">Categoria</option>
                  {categories.filter(c => !c.isDefault).length > 0 && (
                    <optgroup label="Personalizadas">
                      {categories.filter(c => !c.isDefault).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Padrao">
                    {categories.filter(c => c.isDefault).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </optgroup>
                </NativeSelect>
                <Button
                  onClick={handleQuickSave}
                  disabled={quickSaving || !quickAmount}
                  variant="destructive"
                  size="sm"
                  className="gap-1 shrink-0"
                >
                  {quickSaving ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sm:inline hidden">Lancar</span>
                </Button>
              </div>

              {/* Quick re-launch buttons from recent expenses */}
              {recentExpenses.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Relancar despesas recentes:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentExpenses.map(expense => (
                      <Button
                        key={expense.id}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={() => relaunExpense(expense)}
                      >
                        {expense.category?.icon && <span>{expense.category.icon}</span>}
                        {expense.description}
                        <span className="text-muted-foreground">{formatCurrency(expense.amount)}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[90px]" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard title="Despesas Fixas" value={fixedImpact} icon={CalendarClock} variant="danger" />
              <StatCard title="Despesas Variaveis" value={variableTotal} icon={Zap} variant="danger" />
              <StatCard title="Total do Mes" value={fixedImpact + variableTotal} icon={TrendingDown} variant="danger" />
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="variable" className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="variable" className="flex-1 sm:flex-initial gap-1">
                <Zap className="h-4 w-4" /> Variaveis
              </TabsTrigger>
              <TabsTrigger value="fixed" className="flex-1 sm:flex-initial gap-1">
                <CalendarClock className="h-4 w-4" /> Fixas
              </TabsTrigger>
            </TabsList>

            {/* Variable expenses */}
            <TabsContent value="variable">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg">Despesas Variaveis do Mes</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => openCreateModal('variable')} className="gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Lancar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
                  ) : variableExpenses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm">Nenhuma despesa variavel neste mes</p>
                      <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => openCreateModal('variable')}>
                        <Plus className="h-4 w-4" /> Lancar primeira despesa
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variableExpenses.map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base text-destructive">{formatCurrency(expense.amount)}</p>
                              {expense.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {expense.category.icon} {expense.category.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {expense.description && <span className="text-xs sm:text-sm text-muted-foreground truncate">{expense.description}</span>}
                              <span className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Relancar" onClick={() => relaunExpense(expense)}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal('variable', expense)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('variable', expense.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-sm font-medium">Total</span>
                        <span className="font-bold text-destructive">{formatCurrency(variableTotal)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fixed expenses */}
            <TabsContent value="fixed">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg">Despesas Fixas</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => openCreateModal('fixed')} className="gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
                  ) : fixedExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa fixa cadastrada</p>
                  ) : (
                    <div className="space-y-2">
                      {fixedExpenses.map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base text-destructive">{formatCurrency(Number(expense.amount))}</p>
                              {expense.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {expense.category.icon} {expense.category.name}
                                </Badge>
                              )}
                              {!expense.endDate && <Badge variant="outline" className="text-xs">Permanente</Badge>}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Inicio: {new Date(expense.startDate).toLocaleDateString('pt-BR')}
                              {expense.endDate && ` - Fim: ${new Date(expense.endDate).toLocaleDateString('pt-BR')}`}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal('fixed', expense)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('fixed', expense.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Invoice Import Modal */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Importar Fatura do Cartao
            </DialogTitle>
            <DialogDescription>
              Envie o arquivo da fatura (CSV ou PDF) ou cole o conteudo. Suporta XP, Itau, Inter, Nubank e outros.
            </DialogDescription>
          </DialogHeader>

          {invoiceParsing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Clock className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando fatura PDF...</p>
              <p className="text-xs text-muted-foreground">Extraindo transacoes do arquivo</p>
            </div>
          ) : parsedItems.length === 0 ? (
            <div className="space-y-4 py-2">
              {/* File upload */}
              <div className="space-y-2">
                <Label>Arquivo da fatura (CSV ou PDF)</Label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique para selecionar arquivo CSV ou PDF</span>
                    </div>
                    <input
                      type="file"
                      accept=".csv,.txt,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">ou cole o conteudo</span>
                <Separator className="flex-1" />
              </div>

              {/* Text paste */}
              <div className="space-y-2">
                <Label>Conteudo da fatura</Label>
                <Textarea
                  placeholder={`Cole o CSV aqui. Formato esperado:\nData;Estabelecimento;Portador;Valor;Parcela\n01/02/2026;MERCADO;NOME;R$ 156,80;-\n02/02/2026;UBER;NOME;R$ 23,50;-`}
                  value={invoiceText}
                  onChange={(e) => setInvoiceText(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <strong>Formatos suportados:</strong>
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                  <li><strong>PDF:</strong> Itau, Inter (processamento automatico)</li>
                  <li><strong>CSV:</strong> XP, Nubank e outros (separador <code>;</code> ou <code>,</code>)</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Pagamentos e valores negativos sao ignorados automaticamente.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancelar</Button>
                <Button onClick={() => parseInvoice(invoiceText)} disabled={!invoiceText.trim()} className="gap-1">
                  <Upload className="h-4 w-4" /> Processar Fatura
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Stats + filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {invoiceBank && (
                    <Badge variant="outline" className="text-xs">{invoiceBank}</Badge>
                  )}
                  <p className="text-sm font-medium">
                    {parsedItems.filter(i => i.selected).length} de {parsedItems.length} itens selecionados
                  </p>
                  {parsedItems.some(i => i.duplicate) && (
                    <Badge variant="warning" className="text-xs">
                      {parsedItems.filter(i => i.duplicate).length} ja lancado{parsedItems.filter(i => i.duplicate).length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cardholders.length > 1 && (
                    <NativeSelect
                      value={cardholderFilter}
                      onChange={(e) => setCardholderFilter(e.target.value)}
                      className="h-8 text-xs w-auto"
                    >
                      <option value="all">Todos os portadores</option>
                      {cardholders.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </NativeSelect>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setParsedItems(prev => prev.map(i => ({ ...i, selected: true })))}>
                    Selecionar todos
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setParsedItems(prev => prev.map(i => ({ ...i, selected: false })))}>
                    Limpar selecao
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setInvoiceText(''); setParsedItems([]); setInvoiceBank('') }}>
                    Voltar
                  </Button>
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {filteredItems.map((item, _fi) => {
                  const realIndex = parsedItems.indexOf(item)
                  return (
                    <div
                      key={realIndex}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-xs sm:text-sm ${
                        item.selected ? 'bg-accent/50 border-primary/30' : 'bg-muted/30 opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleInvoiceItem(realIndex)}
                        className="rounded shrink-0"
                      />
                      <span className="text-muted-foreground w-20 shrink-0 hidden sm:block">
                        {item.date.split('-').reverse().join('/')}
                      </span>
                      <Input
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(realIndex, 'description', e.target.value)}
                        className="flex-1 h-7 text-xs sm:text-sm"
                      />
                      {item.duplicate && (
                        <Badge variant="warning" className="text-[10px] shrink-0">
                          Ja lancado
                        </Badge>
                      )}
                      {item.cardholder && (
                        <Badge variant="outline" className="text-[10px] shrink-0 hidden md:flex">
                          {item.cardholder.split(' ')[0]}
                        </Badge>
                      )}
                      {item.card && (
                        <Badge variant="outline" className="text-[10px] shrink-0 hidden md:flex">
                          {item.card}
                        </Badge>
                      )}
                      {item.installment && item.installment !== '-' && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {item.installment}
                        </Badge>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.amount || ''}
                          onChange={(e) => updateInvoiceItem(realIndex, 'amount', e.target.value)}
                          className="w-20 h-7 text-xs text-right"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeInvoiceItem(realIndex)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total selecionado ({parsedItems.filter(i => i.selected && i.amount > 0).length} itens):</span>
                <span className="font-bold text-destructive text-base">
                  {formatCurrency(parsedItems.filter(i => i.selected && i.amount > 0).reduce((a, b) => a + b.amount, 0))}
                </span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleInvoiceSave}
                  disabled={invoiceSaving || parsedItems.filter(i => i.selected && i.amount > 0).length === 0}
                  variant="destructive"
                  className="gap-1"
                >
                  {invoiceSaving ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Lancar {parsedItems.filter(i => i.selected && i.amount > 0).length} Despesas
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : 'Nova'} Despesa {modalType === 'fixed' ? 'Fixa' : 'Variavel'}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'fixed'
                ? 'Despesas fixas sao cobradas todo mes automaticamente.'
                : 'Lance rapidamente suas despesas do dia a dia.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Input placeholder="Ex: Mercado, Uber..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <NativeSelect value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.filter(c => !c.isDefault).length > 0 && (
                  <optgroup label="Personalizadas">
                    {categories.filter(c => !c.isDefault).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Padrao">
                  {categories.filter(c => c.isDefault).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </optgroup>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>{modalType === 'fixed' ? 'Data de inicio' : 'Data'}</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            {modalType === 'fixed' && (
              <div className="space-y-2">
                <Label>Data final (opcional - vazio = permanente)</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            )}
            {modalType === 'variable' && !editingId && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="continue" checked={continueAdding} onChange={(e) => setContinueAdding(e.target.checked)} className="rounded" />
                <Label htmlFor="continue" className="text-sm cursor-pointer">Continuar lancando</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formAmount}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
