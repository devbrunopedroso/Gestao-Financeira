'use client'

import { useState, useEffect } from 'react'
import { NativeSelect } from '@/components/ui/select-native'
import { Skeleton } from '@/components/ui/skeleton'

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
        if (data.length > 0 && !value) {
          onChange(data[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-10 w-[180px]" />
  }

  if (accounts.length === 0) {
    return (
      <NativeSelect disabled className={className}>
        <option>Nenhuma conta</option>
      </NativeSelect>
    )
  }

  return (
    <NativeSelect
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </NativeSelect>
  )
}
