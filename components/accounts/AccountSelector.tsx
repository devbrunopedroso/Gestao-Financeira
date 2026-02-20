'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Wallet, ChevronDown } from 'lucide-react'

const STORAGE_KEY = 'selectedAccountId'

interface Account {
  id: string
  name: string
}

interface AccountSelectorProps {
  value?: string
  onChange: (accountId: string) => void
  className?: string
}

export function AccountSelector({ value, onChange, className = '' }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
        if (data.length > 0) {
          const saved = localStorage.getItem(STORAGE_KEY)
          const savedExists = saved && data.some((a: Account) => a.id === saved)
          const initial = savedExists ? saved : data[0].id
          if (initial !== value) {
            onChange(initial)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (accountId: string) => {
    localStorage.setItem(STORAGE_KEY, accountId)
    onChange(accountId)
  }

  if (loading) {
    return <Skeleton className="h-14 w-full rounded-xl" />
  }

  if (accounts.length === 0) {
    return (
      <div className={`flex items-center gap-3 w-full rounded-xl border bg-card p-3 ${className}`}>
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Wallet className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Minha Carteira</span>
        <span className="text-sm text-muted-foreground ml-auto">Nenhuma conta</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 w-full rounded-xl border bg-card p-3 shadow-sm ${className}`}>
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Wallet className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm font-medium text-muted-foreground shrink-0">Minha Carteira</span>
      <div className="relative flex-1 min-w-0">
        <select
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 truncate"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}
