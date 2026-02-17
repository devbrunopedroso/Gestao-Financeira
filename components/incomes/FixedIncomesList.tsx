'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/helpers'

interface FixedIncome {
  id: string
  amount: number
  description: string | null
  createdAt: string
}

interface FixedIncomesListProps {
  accountId: string
}

export function FixedIncomesList({ accountId }: FixedIncomesListProps) {
  const [incomes, setIncomes] = useState<FixedIncome[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accountId) fetchIncomes()
  }, [accountId])

  const fetchIncomes = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/incomes/fixed?accountId=${accountId}`)
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
    return <Card><CardHeader><CardTitle>Rendas Fixas</CardTitle></CardHeader><CardContent>Carregando...</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader><CardTitle>Rendas Fixas</CardTitle></CardHeader>
      <CardContent>
        {incomes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhuma renda fixa cadastrada</p>
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
