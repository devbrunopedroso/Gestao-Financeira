'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/select-native'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/helpers'
import {
  PiggyBank, Plus, Target, TrendingUp, Calendar,
  ArrowUpCircle, ArrowDownCircle, Trash2, Share2, SkipForward, PlayCircle,
} from 'lucide-react'

interface PiggyBankItem {
  id: string; name: string; description: string | null
  targetAmount: number; currentAmount: number
  suggestedMonthlyAmount: number; monthsRemaining: number; progress: number
  startDate: string; endDate: string | null; months: number | null
  monthlyContribution: number | null
  skippedMonths?: Array<{ month: number; year: number }>
  transactions?: Array<{
    id: string; amount: number; type: string; description: string | null; date: string
  }>
}

export function PiggyBanksPage() {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [piggyBanks, setPiggyBanks] = useState<PiggyBankItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPB, setSelectedPB] = useState<PiggyBankItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Create/Edit modal
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTarget, setFormTarget] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formMonths, setFormMonths] = useState('')
  const [formMonthlyContribution, setFormMonthlyContribution] = useState('')
  const [saving, setSaving] = useState(false)
  const [skipSaving, setSkipSaving] = useState<string | null>(null)

  // Transaction modal
  const [txOpen, setTxOpen] = useState(false)
  const [txPBId, setTxPBId] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txType, setTxType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')
  const [txDescription, setTxDescription] = useState('')
  const [txSaving, setTxSaving] = useState(false)

  // Share modal
  const [shareOpen, setShareOpen] = useState(false)
  const [sharePBId, setSharePBId] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState('VIEWER')
  const [sharing, setSharing] = useState(false)

  const fetchPiggyBanks = useCallback(async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/piggy-banks?accountId=${selectedAccountId}`)
      if (res.ok) setPiggyBanks(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { fetchPiggyBanks() }, [fetchPiggyBanks])

  const fetchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/piggy-banks/${id}`)
      if (res.ok) setSelectedPB(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setFormName(''); setFormDescription(''); setFormTarget(''); setFormEndDate(''); setFormMonths(''); setFormMonthlyContribution('')
    setCreateOpen(true)
  }

  const handleSavePB = async () => {
    if (!formName || !formTarget) return
    setSaving(true)
    try {
      const url = editingId ? `/api/piggy-banks/${editingId}` : '/api/piggy-banks'
      const method = editingId ? 'PUT' : 'POST'
      const body: any = {
        name: formName,
        description: formDescription || undefined,
        targetAmount: Number(formTarget),
        accountId: selectedAccountId,
        monthlyContribution: formMonthlyContribution ? Number(formMonthlyContribution) : null,
      }
      if (formEndDate) body.endDate = formEndDate
      else if (formMonths) body.months = Number(formMonths)
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setCreateOpen(false); fetchPiggyBanks() }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePB = async (id: string) => {
    if (!confirm('Deseja excluir esta caixinha?')) return
    try {
      const res = await fetch(`/api/piggy-banks/${id}`, { method: 'DELETE' })
      if (res.ok) { fetchPiggyBanks(); if (selectedPB?.id === id) setSelectedPB(null) }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const openTx = (pbId: string, type: 'DEPOSIT' | 'WITHDRAWAL') => {
    setTxPBId(pbId); setTxType(type); setTxAmount(''); setTxDescription(''); setTxOpen(true)
  }

  const handleTx = async () => {
    if (!txAmount) return
    setTxSaving(true)
    try {
      const res = await fetch(`/api/piggy-banks/${txPBId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(txAmount), type: txType, description: txDescription || undefined, date: new Date().toISOString() }),
      })
      if (res.ok) {
        setTxOpen(false); fetchPiggyBanks()
        if (selectedPB?.id === txPBId) fetchDetail(txPBId)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setTxSaving(false)
    }
  }

  const handleDeleteTx = async (pbId: string, txId: string) => {
    if (!confirm('Deseja excluir esta transacao?')) return
    try {
      const res = await fetch(`/api/piggy-banks/${pbId}/transactions/${txId}`, { method: 'DELETE' })
      if (res.ok) { fetchPiggyBanks(); fetchDetail(pbId) }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const openShare = (pbId: string) => {
    setSharePBId(pbId); setShareEmail(''); setShareRole('VIEWER'); setShareOpen(true)
  }

  const handleShare = async () => {
    if (!shareEmail) return
    setSharing(true)
    try {
      const res = await fetch(`/api/piggy-banks/${sharePBId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail, role: shareRole }),
      })
      if (res.ok) { setShareOpen(false); alert('Caixinha compartilhada!') }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setSharing(false)
    }
  }

  const handleToggleSkip = async (pbId: string, month: number, year: number, currentlySkipped: boolean) => {
    setSkipSaving(pbId)
    try {
      const res = await fetch(`/api/piggy-banks/${pbId}/skip-month`, {
        method: currentlySkipped ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      })
      if (res.ok) fetchPiggyBanks()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setSkipSaving(null)
    }
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <PiggyBank className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Caixinhas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Seus objetivos financeiros</p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Nova Caixinha
        </Button>
      </div>

      <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[250px]" />)}
        </div>
      ) : piggyBanks.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhuma caixinha</h3>
            <p className="text-sm text-muted-foreground">Crie sua primeira caixinha para definir um objetivo financeiro.</p>
            <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> Criar Caixinha</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {piggyBanks.map(pb => (
            <Card key={pb.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate">{pb.name}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openShare(pb.id)}>
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePB(pb.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {pb.description && <p className="text-xs text-muted-foreground">{pb.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-semibold">{pb.progress}%</span>
                  </div>
                  <Progress value={pb.progress} className="h-2" indicatorClassName={pb.progress >= 100 ? 'bg-success' : 'bg-primary'} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Atual</span>
                    <p className="font-semibold">{formatCurrency(pb.currentAmount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Objetivo</span>
                    <p className="font-semibold">{formatCurrency(pb.targetAmount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mensal sugerido</span>
                    <p className="font-semibold text-primary">{formatCurrency(pb.suggestedMonthlyAmount)}</p>
                  </div>
                  {pb.monthsRemaining > 0 && (
                    <div>
                      <span className="text-muted-foreground">Meses restantes</span>
                      <p className="font-semibold">{pb.monthsRemaining}</p>
                    </div>
                  )}
                  {pb.monthlyContribution != null && pb.monthlyContribution > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Contribuicao fixa/mes</span>
                      <p className="font-semibold text-destructive">{formatCurrency(pb.monthlyContribution)}</p>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => openTx(pb.id, 'DEPOSIT')}>
                    <ArrowUpCircle className="h-3.5 w-3.5 text-success" /> Depositar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => openTx(pb.id, 'WITHDRAWAL')}>
                    <ArrowDownCircle className="h-3.5 w-3.5 text-destructive" /> Retirar
                  </Button>
                </div>
                {pb.monthlyContribution != null && pb.monthlyContribution > 0 && (() => {
                  const isSkipped = pb.skippedMonths?.some(
                    s => s.month === currentMonth && s.year === currentYear
                  ) ?? false
                  return (
                    <Button
                      size="sm"
                      variant={isSkipped ? 'default' : 'outline'}
                      className={`w-full text-xs gap-1 ${isSkipped ? '' : 'border-warning/50 text-warning hover:text-warning'}`}
                      onClick={() => handleToggleSkip(pb.id, currentMonth, currentYear, isSkipped)}
                      disabled={skipSaving === pb.id}
                    >
                      {isSkipped ? (
                        <><PlayCircle className="h-3.5 w-3.5" /> Reativar contribuicao deste mes</>
                      ) : (
                        <><SkipForward className="h-3.5 w-3.5" /> Pular este mes</>
                      )}
                    </Button>
                  )
                })()}
                <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => fetchDetail(pb.id)}>
                  Ver transacoes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedPB && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">{selectedPB.name} - Transacoes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPB(null)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : !selectedPB.transactions || selectedPB.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transacao registrada</p>
            ) : (
              <div className="space-y-2">
                {selectedPB.transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      {tx.type === 'DEPOSIT' ? (
                        <ArrowUpCircle className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div>
                        <p className={`font-semibold text-sm ${tx.type === 'DEPOSIT' ? 'text-success' : 'text-destructive'}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.description && `${tx.description} - `}
                          {new Date(tx.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTx(selectedPB.id, tx.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create PB Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Caixinha</DialogTitle>
            <DialogDescription>Defina um objetivo financeiro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Viagem, Carro..." value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descricao (opcional)</Label>
              <Input placeholder="Descricao do objetivo" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor objetivo (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input type="date" value={formEndDate} onChange={(e) => { setFormEndDate(e.target.value); setFormMonths('') }} />
              </div>
              <div className="space-y-2">
                <Label>Ou meses</Label>
                <Input type="number" min="1" placeholder="12" value={formMonths} onChange={(e) => { setFormMonths(e.target.value); setFormEndDate('') }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contribuicao mensal fixa (R$)</Label>
              <p className="text-xs text-muted-foreground">Opcional. Se informado, sera contabilizado como despesa fixa todo mes.</p>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={formMonthlyContribution} onChange={(e) => setFormMonthlyContribution(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePB} disabled={saving || !formName || !formTarget}>
              {saving ? 'Salvando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{txType === 'DEPOSIT' ? 'Depositar' : 'Retirar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descricao (opcional)</Label>
              <Input placeholder="Descricao" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxOpen(false)}>Cancelar</Button>
            <Button onClick={handleTx} disabled={txSaving || !txAmount} variant={txType === 'DEPOSIT' ? 'default' : 'destructive'}>
              {txSaving ? 'Salvando...' : txType === 'DEPOSIT' ? 'Depositar' : 'Retirar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Compartilhar Caixinha</DialogTitle>
            <DialogDescription>Compartilhe esta caixinha com outra pessoa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@exemplo.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Permissao</Label>
              <NativeSelect value={shareRole} onChange={(e) => setShareRole(e.target.value)}>
                <option value="VIEWER">Leitor</option>
                <option value="EDITOR">Editor</option>
              </NativeSelect>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Cancelar</Button>
            <Button onClick={handleShare} disabled={sharing || !shareEmail}>
              {sharing ? 'Compartilhando...' : 'Compartilhar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
