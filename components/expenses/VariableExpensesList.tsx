'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/helpers'
import Link from 'next/link'

interface VariableExpense {
  id: string
  amount: number
  description: string | null
  date: string
  category: {
    id: string
    name: string
    color: string | null
  } | null
}

interface VariableExpensesListProps {
  accountId: string
  month: number
  year: number
}

export function VariableExpensesList({
  accountId,
  month,
  year,
}: VariableExpensesListProps) {
  const [expenses, setExpenses] = useState<VariableExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accountId) {
      fetchExpenses()
    }
  }, [accountId, month, year])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/expenses/variable?accountId=${accountId}&month=${month}&year=${year}`
      )
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.map((exp: any) => ({
          ...exp,
          amount: Number(exp.amount),
        })))
      }
    } catch (error) {
      console.error('Erro ao buscar despesas variáveis:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return
    try {
      const response = await fetch(`/api/expenses/variable/${id}`, { method: 'DELETE' })
      if (response.ok) fetchExpenses()
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  if (loading) {
    return <Card><CardHeader><CardTitle>Despesas Variaveis</CardTitle></CardHeader><CardContent>Carregando...</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas Variaveis do Mes</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhuma despesa variavel para este mes</p>
        ) : (
          <div className="space-y-3">
            <div className="mb-4 p-3 bg-muted rounded-lg flex justify-between items-center">
              <span className="font-medium">Total do mes:</span>
              <span className="text-xl font-bold text-destructive">{formatCurrency(total)}</span>
            </div>
            {expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent/50">
                <div className="flex-1">
                  <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                  {expense.description && <p className="text-sm text-muted-foreground mt-1">{expense.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(expense.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => handleDelete(expense.id)} className="text-sm text-destructive hover:underline">Excluir</button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
