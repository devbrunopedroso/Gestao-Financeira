'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/helpers'

interface ExtraIncome {
  id: string
  amount: number
  description: string | null
  month: number
  year: number
}

interface ExtraIncomesListProps {
  accountId: string
  month: number
  year: number
}

export function ExtraIncomesList({ accountId, month, year }: ExtraIncomesListProps) {
  const [incomes, setIncomes] = useState<ExtraIncome[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accountId) fetchIncomes()
  }, [accountId, month, year])

  const fetchIncomes = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/incomes/extra?accountId=${accountId}&month=${month}&year=${year}`)
      if (response.ok) {
        const data = await response.json()
        setIncomes(data.map((inc: any) => ({ ...inc, amount: Number(inc.amount) })))
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Card><CardHeader><CardTitle>Rendas Extras</CardTitle></CardHeader><CardContent>Carregando...</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader><CardTitle>Rendas Extras do Mes</CardTitle></CardHeader>
      <CardContent>
        {incomes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhuma renda extra para este mes</p>
        ) : (
          <div className="space-y-3">
            {incomes.map((income) => (
              <div key={income.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{formatCurrency(income.amount)}</p>
                  {income.description && <p className="text-sm text-muted-foreground">{income.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
