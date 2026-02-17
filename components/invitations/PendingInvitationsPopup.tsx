'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Mail, UserPlus } from 'lucide-react'

interface PendingInvitation {
  id: string
  token: string
  role: string
  expiresAt: string
  account: {
    name: string
    creator: { name: string | null; email: string | null }
  }
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VIEWER: 'Visualizador',
}

export function PendingInvitationsPopup() {
  const { data: session } = useSession()
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [open, setOpen] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/invitations/pending')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setInvitations(data)
        setOpen(true)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchInvitations()
    }
  }, [session, fetchInvitations])

  const handleAccept = async (invitation: PendingInvitation) => {
    setAccepting(invitation.id)
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitation.token }),
      })
      if (res.ok) {
        const remaining = invitations.filter((i) => i.id !== invitation.id)
        setInvitations(remaining)
        if (remaining.length === 0) {
          setOpen(false)
          window.location.reload()
        }
      }
    } catch {
      // silently fail
    } finally {
      setAccepting(null)
    }
  }

  if (invitations.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {invitations.length === 1
              ? 'Voce tem um convite pendente'
              : `Voce tem ${invitations.length} convites pendentes`}
          </DialogTitle>
          <DialogDescription className="text-center">
            Aceite para acessar as contas compartilhadas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {invitation.account.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Convidado por{' '}
                    {invitation.account.creator.name ||
                      invitation.account.creator.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {roleLabels[invitation.role] || invitation.role}
                </Badge>
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation)}
                  disabled={accepting === invitation.id}
                  className="gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  {accepting === invitation.id ? 'Aceitando...' : 'Aceitar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
