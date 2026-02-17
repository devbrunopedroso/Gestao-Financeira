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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/helpers'
import { TrendingUp, Plus, Pencil, Trash2, Banknote, Gift } from 'lucide-react'

interface FixedIncome {
  id: string; amount: number; description: string | null
}
interface ExtraIncome {
  id: string; amount: number; description: string | null; month: number; year: number
}

export function IncomesPage() {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([])
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'fixed' | 'extra'>('fixed')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const [fixedRes, extraRes, summaryRes] = await Promise.all([
        fetch(`/api/incomes/fixed?accountId=${selectedAccountId}`),
        fetch(`/api/incomes/extra?accountId=${selectedAccountId}&month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/incomes/monthly?accountId=${selectedAccountId}&month=${currentMonth}&year=${currentYear}`),
      ])
      if (fixedRes.ok) {
        const data = await fixedRes.json()
        setFixedIncomes(data.map((i: any) => ({ ...i, amount: Number(i.amount) })))
      }
      if (extraRes.ok) {
        const data = await extraRes.json()
        setExtraIncomes(data.map((i: any) => ({ ...i, amount: Number(i.amount) })))
      }
      if (summaryRes.ok) {
        setSummary(await summaryRes.json())
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId, currentMonth, currentYear])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreateModal = (type: 'fixed' | 'extra') => {
    setModalType(type)
    setEditingId(null)
    setFormAmount('')
    setFormDescription('')
    setModalOpen(true)
  }

  const openEditModal = (type: 'fixed' | 'extra', item: FixedIncome | ExtraIncome) => {
    setModalType(type)
    setEditingId(item.id)
    setFormAmount(String(item.amount))
    setFormDescription(item.description || '')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formAmount || Number(formAmount) <= 0) return
    setSaving(true)
    try {
      const isFixed = modalType === 'fixed'
      const url = editingId
        ? `/api/incomes/${isFixed ? 'fixed' : 'extra'}/${editingId}`
        : `/api/incomes/${isFixed ? 'fixed' : 'extra'}`
      const method = editingId ? 'PUT' : 'POST'
      const body: any = {
        amount: Number(formAmount),
        description: formDescription || undefined,
        accountId: selectedAccountId,
      }
      if (!isFixed) {
        body.month = currentMonth
        body.year = currentYear
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchAll()
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type: 'fixed' | 'extra', id: string) => {
    if (!confirm('Deseja realmente excluir?')) return
    try {
      const res = await fetch(`/api/incomes/${type}/${id}`, { method: 'DELETE' })
      if (res.ok) fetchAll()
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-success" />
            Rendas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas rendas fixas e extras</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreateModal('fixed')} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Renda Fixa
          </Button>
          <Button onClick={() => openCreateModal('extra')} size="sm" variant="outline" className="gap-1">
            <Plus className="h-4 w-4" /> Renda Extra
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
          {/* Summary */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[90px]" />)}
            </div>
          ) : summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard title="Renda Fixa" value={summary.fixedIncome || 0} icon={Banknote} variant="success" />
              <StatCard title="Rendas Extras" value={summary.extraIncome || 0} icon={Gift} variant="success" />
              <StatCard title="Total Mensal" value={summary.total || 0} icon={TrendingUp} variant="success" />
            </div>
          )}

          {/* Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rendas Fixas */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-success" />
                    Rendas Fixas
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => openCreateModal('fixed')} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
                ) : fixedIncomes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma renda fixa cadastrada</p>
                ) : (
                  <div className="space-y-2">
                    {fixedIncomes.map(income => (
                      <div key={income.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base">{formatCurrency(income.amount)}</p>
                          {income.description && <p className="text-xs sm:text-sm text-muted-foreground truncate">{income.description}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal('fixed', income)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('fixed', income.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm font-medium">Total</span>
                      <span className="font-bold text-success">{formatCurrency(fixedIncomes.reduce((a, b) => a + b.amount, 0))}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rendas Extras */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Gift className="h-5 w-5 text-success" />
                    Rendas Extras do Mes
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => openCreateModal('extra')} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
                ) : extraIncomes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma renda extra para este mes</p>
                ) : (
                  <div className="space-y-2">
                    {extraIncomes.map(income => (
                      <div key={income.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base">{formatCurrency(income.amount)}</p>
                          {income.description && <p className="text-xs sm:text-sm text-muted-foreground truncate">{income.description}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal('extra', income)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('extra', income.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm font-medium">Total</span>
                      <span className="font-bold text-success">{formatCurrency(extraIncomes.reduce((a, b) => a + b.amount, 0))}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Modal Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : 'Nova'} Renda {modalType === 'fixed' ? 'Fixa' : 'Extra'}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'fixed'
                ? 'Rendas fixas sao consideradas automaticamente todo mes.'
                : 'Rendas extras sao consideradas apenas no mes selecionado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao (opcional)</Label>
              <Input
                id="description"
                placeholder="Ex: Salario, Freelance..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
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
