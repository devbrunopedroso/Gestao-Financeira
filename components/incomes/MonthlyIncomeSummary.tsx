'use client'

import { useState, useEffect } from 'react'
import { StatCard } from '@/components/ui/StatCard'
import { Banknote, Gift, TrendingUp } from 'lucide-react'

interface MonthlyIncomeSummaryProps {
  accountId: string
  month: number
  year: number
}

export function MonthlyIncomeSummary({ accountId, month, year }: MonthlyIncomeSummaryProps) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accountId) fetchSummary()
  }, [accountId, month, year])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/incomes/monthly?accountId=${accountId}&month=${month}&year=${year}`)
      if (response.ok) setSummary(await response.json())
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary) {
    return <div className="text-center py-4">Carregando...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Renda Fixa" value={summary.fixedIncome} icon={Banknote} variant="success" />
      <StatCard title="Rendas Extras" value={summary.extraIncome} icon={Gift} variant="success" />
      <StatCard title="Total Mensal" value={summary.total} icon={TrendingUp} variant="success" />
    </div>
  )
}
