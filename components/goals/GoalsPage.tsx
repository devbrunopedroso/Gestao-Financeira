'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/ui/select-native'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/helpers'
import {
  Target, Plus, Pencil, Trash2, Shield, TrendingUp, Crosshair,
} from 'lucide-react'

const GOAL_TYPE_LABELS: Record<string, { label: string; icon: typeof Target; color: string; desc: string }> = {
  EMERGENCY_FUND: {
    label: 'Reserva de Emergencia',
    icon: Shield,
    color: 'bg-emerald-100 text-emerald-700',
    desc: 'Auto-calculado: 6x media de despesas mensais',
  },
  SAVINGS_RATE: {
    label: 'Taxa de Poupanca',
    icon: TrendingUp,
    color: 'bg-blue-100 text-blue-700',
    desc: 'Percentual da renda que voce poupa por mes',
  },
  CUSTOM: {
    label: 'Meta Personalizada',
    icon: Crosshair,
    color: 'bg-purple-100 text-purple-700',
    desc: 'Defina seu proprio objetivo e acompanhe o progresso',
  },
}

interface GoalItem {
  id: string
  name: string
  type: 'EMERGENCY_FUND' | 'SAVINGS_RATE' | 'CUSTOM'
  targetValue: number
  currentValue: number
  progress: number
  deadline: string | null
}

export function GoalsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<string>('CUSTOM')
  const [formTargetValue, setFormTargetValue] = useState('')
  const [formCurrentValue, setFormCurrentValue] = useState('')
  const [formDeadline, setFormDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchGoals = useCallback(async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/goals?accountId=${selectedAccountId}`)
      if (res.ok) {
        const data = await res.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const openCreate = () => {
    setEditingId(null)
    setFormError('')
    setFormName('')
    setFormType('CUSTOM')
    setFormTargetValue('')
    setFormCurrentValue('')
    setFormDeadline('')
    setModalOpen(true)
  }

  const openEdit = (goal: GoalItem) => {
    setEditingId(goal.id)
    setFormError('')
    setFormName(goal.name)
    setFormType(goal.type)
    setFormTargetValue(String(goal.targetValue))
    setFormCurrentValue(String(goal.currentValue))
    setFormDeadline(goal.deadline ? goal.deadline.split('T')[0] : '')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName || !formTargetValue) return
    setSaving(true)
    setFormError('')
    try {
      if (editingId) {
        const res = await fetch(`/api/goals/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            targetValue: Number(formTargetValue),
            currentValue: formType === 'CUSTOM' ? Number(formCurrentValue || 0) : undefined,
            deadline: formDeadline || null,
          }),
        })
        if (res.ok) { setModalOpen(false); fetchGoals() }
        else {
          const data = await res.json()
          setFormError(data.message || 'Erro ao salvar')
        }
      } else {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            type: formType,
            targetValue: Number(formTargetValue),
            currentValue: formType === 'CUSTOM' ? Number(formCurrentValue || 0) : 0,
            deadline: formDeadline || null,
            accountId: selectedAccountId,
          }),
        })
        if (res.ok) { setModalOpen(false); fetchGoals() }
        else {
          const data = await res.json()
          setFormError(data.message || 'Erro ao criar')
        }
      }
    } catch (error) {
      console.error('Erro:', error)
      setFormError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      if (res.ok) fetchGoals()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const isAutoComputed = formType === 'EMERGENCY_FUND' || formType === 'SAVINGS_RATE'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Metas Financeiras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Defina e acompanhe seus objetivos financeiros</p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Nova Meta
        </Button>
      </div>

      <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[180px]" />)}
        </div>
      ) : goals.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhuma meta definida</h3>
            <p className="text-sm text-muted-foreground">Crie metas para acompanhar seus objetivos financeiros.</p>
            <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> Criar Meta</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const typeInfo = GOAL_TYPE_LABELS[goal.type] || GOAL_TYPE_LABELS.CUSTOM
            const TypeIcon = typeInfo.icon
            const isSavingsRate = goal.type === 'SAVINGS_RATE'
            return (
              <Card key={goal.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg truncate">{goal.name}</CardTitle>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="outline" className={`gap-1 text-xs w-fit ${typeInfo.color}`}>
                    <TypeIcon className="h-3 w-3" />
                    {typeInfo.label}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{goal.progress}%</span>
                    </div>
                    <Progress
                      value={goal.progress}
                      className="h-2.5"
                      indicatorClassName={goal.progress >= 100 ? 'bg-success' : goal.progress >= 50 ? 'bg-primary' : 'bg-amber-500'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Atual</span>
                      <p className="font-semibold text-primary">
                        {isSavingsRate ? `${goal.currentValue}%` : formatCurrency(goal.currentValue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Meta</span>
                      <p className="font-semibold">
                        {isSavingsRate ? `${goal.targetValue}%` : formatCurrency(goal.targetValue)}
                      </p>
                    </div>
                  </div>
                  {goal.type !== 'CUSTOM' && (
                    <p className="text-[11px] text-muted-foreground italic">{typeInfo.desc}</p>
                  )}
                  {goal.deadline && (
                    <p className="text-xs text-muted-foreground">
                      Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Altere os dados da meta.' : 'Defina um objetivo financeiro para acompanhar.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Reserva de emergência..." value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            {!editingId && (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <NativeSelect value={formType} onChange={e => {
                  setFormType(e.target.value)
                  if (e.target.value === 'EMERGENCY_FUND') {
                    setFormName(formName || 'Reserva de Emergência')
                  } else if (e.target.value === 'SAVINGS_RATE') {
                    setFormName(formName || 'Taxa de Poupança Mensal')
                    setFormTargetValue('20')
                  }
                }}>
                  <option value="CUSTOM">Meta Personalizada</option>
                  <option value="EMERGENCY_FUND">Reserva de Emergência (auto-calculado)</option>
                  <option value="SAVINGS_RATE">Taxa de Poupança (%)</option>
                </NativeSelect>
                <p className="text-xs text-muted-foreground">
                  {GOAL_TYPE_LABELS[formType]?.desc}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{formType === 'SAVINGS_RATE' ? 'Meta (%)' : 'Valor Alvo (R$)'}</Label>
              {isAutoComputed && !editingId ? (
                <p className="text-xs text-muted-foreground">
                  {formType === 'EMERGENCY_FUND'
                    ? 'O valor será calculado automaticamente (6x média de despesas mensais).'
                    : 'Defina a porcentagem da renda que deseja poupar.'}
                </p>
              ) : null}
              {(formType === 'SAVINGS_RATE' || formType === 'CUSTOM' || editingId) && (
                <Input
                  type="number" step="0.01" min="0"
                  placeholder={formType === 'SAVINGS_RATE' ? '20' : '0,00'}
                  value={formTargetValue}
                  onChange={e => setFormTargetValue(e.target.value)}
                />
              )}
            </div>
            {formType === 'CUSTOM' && (
              <div className="space-y-2">
                <Label>Valor Atual (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={formCurrentValue} onChange={e => setFormCurrentValue(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
            </div>
          </div>
          {formError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{formError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName || (formType !== 'EMERGENCY_FUND' && !formTargetValue)}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
