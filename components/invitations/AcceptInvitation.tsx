'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, UserPlus } from 'lucide-react'

export function AcceptInvitation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de convite nao encontrado na URL.')
      return
    }
    setStatus('ready')
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setStatus('accepting')
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage('Convite aceito! Redirecionando...')
        setTimeout(() => router.push('/'), 2000)
      } else {
        setStatus('error')
        setMessage(data.message || 'Erro ao aceitar convite')
      }
    } catch {
      setStatus('error')
      setMessage('Erro de conexao. Tente novamente.')
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            {status === 'success' ? (
              <Check className="h-7 w-7 text-success" />
            ) : status === 'error' ? (
              <X className="h-7 w-7 text-destructive" />
            ) : status === 'accepting' ? (
              <Clock className="h-7 w-7 text-primary animate-spin" />
            ) : (
              <UserPlus className="h-7 w-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'success' ? 'Convite Aceito!' :
             status === 'error' ? 'Erro' :
             status === 'accepting' ? 'Aceitando...' :
             'Convite para Conta Financeira'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'ready' && (
            <>
              <p className="text-sm text-muted-foreground">
                Voce foi convidado para acessar uma conta financeira compartilhada.
                Clique abaixo para aceitar o convite.
              </p>
              <Button onClick={handleAccept} size="lg" className="gap-2">
                <Check className="h-4 w-4" />
                Aceitar Convite
              </Button>
            </>
          )}
          {(status === 'success' || status === 'error') && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          {status === 'error' && (
            <Button variant="outline" onClick={() => router.push('/')}>
              Voltar ao inicio
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
