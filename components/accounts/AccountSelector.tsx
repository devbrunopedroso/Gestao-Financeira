'use client'

import { useState, useEffect } from 'react'
import { NativeSelect } from '@/components/ui/select-native'
import { Skeleton } from '@/components/ui/skeleton'

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
        if (data.length > 0 && !value) {
          const saved = localStorage.getItem(STORAGE_KEY)
          const savedExists = saved && data.some((a: Account) => a.id === saved)
          onChange(savedExists ? saved : data[0].id)
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
      onChange={(e) => handleChange(e.target.value)}
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
