'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/ui/select-native'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/helpers'
import Link from 'next/link'
import { Plus, Users, Wallet, UserPlus, Mail, LogOut } from 'lucide-react'

interface Account {
  id: string
  name: string
  creatorId: string
  createdAt: string
  myRole: string
  members: Array<{ role: string; user: { id: string; name: string; email: string } }>
}

export function AccountsList() {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Create account modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteAccountId, setInviteAccountId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('VIEWER')
  const [inviting, setInviting] = useState(false)

  // Leave modal
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveAccount, setLeaveAccount] = useState<Account | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => { fetchAccounts() }, [])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) setAccounts(await res.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName || newName.length < 3) return
    setSaving(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setNewName('')
        fetchAccounts()
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail || !inviteAccountId) return
    setInviting(true)
    try {
      const res = await fetch(`/api/accounts/${inviteAccountId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (res.ok) {
        setInviteOpen(false)
        setInviteEmail('')
        alert('Convite enviado com sucesso!')
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setInviting(false)
    }
  }

  const openInvite = (accountId: string) => {
    setInviteAccountId(accountId)
    setInviteEmail('')
    setInviteRole('VIEWER')
    setInviteOpen(true)
  }

  const openLeave = (account: Account) => {
    setLeaveAccount(account)
    setLeaveOpen(true)
  }

  const handleLeave = async () => {
    if (!leaveAccount) return
    setLeaving(true)
    try {
      const res = await fetch(`/api/accounts/${leaveAccount.id}/leave`, {
        method: 'POST',
      })
      if (res.ok) {
        setLeaveOpen(false)
        setLeaveAccount(null)
        fetchAccounts()
      } else {
        const data = await res.json()
        alert(data.message || 'Erro ao sair da conta')
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLeaving(false)
    }
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    EDITOR: 'Editor',
    VIEWER: 'Leitor',
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Contas Financeiras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas pessoais e compartilhadas</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Nova Conta
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px]" />)}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhuma conta encontrada</h3>
            <p className="text-sm text-muted-foreground">Crie sua primeira conta financeira para comecar.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Criar Primeira Conta
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {account.myRole === 'ADMIN' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openInvite(account.id)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    {account.creatorId !== session?.user?.id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openLeave(account)}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{account.members.length} membro{account.members.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {account.members.slice(0, 3).map((member, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {member.user.name || member.user.email} ({roleLabels[member.role]})
                      </Badge>
                    ))}
                    {account.members.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{account.members.length - 3}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conta Financeira</DialogTitle>
            <DialogDescription>Crie uma conta para gerenciar suas financas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da conta</Label>
              <Input placeholder="Ex: Pessoal, Familia..." value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || newName.length < 3}>
              {saving ? 'Criando...' : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Usuario</DialogTitle>
            <DialogDescription>Convide alguem para colaborar nesta conta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@exemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Permissao</Label>
              <NativeSelect value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="VIEWER">Leitor - apenas visualiza</option>
                <option value="EDITOR">Editor - pode editar dados</option>
                <option value="ADMIN">Admin - controle total</option>
              </NativeSelect>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Account Modal */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sair da Conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair da conta <strong>{leaveAccount?.name}</strong>?
              Voce perdera o acesso a todos os dados desta conta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleLeave} disabled={leaving}>
              {leaving ? 'Saindo...' : 'Sair da Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
