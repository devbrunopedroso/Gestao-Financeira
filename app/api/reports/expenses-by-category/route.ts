import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange } from '@/lib/helpers'

/**
 * GET /api/reports/expenses-by-category
 * Retorna gastos agrupados por categoria
 * US-30: Visualizar gastos por categoria
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!accountId) {
      return NextResponse.json(
        { message: 'accountId é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar acesso
    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { message: 'Acesso negado' },
        { status: 403 }
      )
    }

    let variableExpenses

    if (month && year) {
      // Filtrar por mês específico
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const { startDate, endDate } = getMonthRange(yearNum, monthNum)

      variableExpenses = await prisma.variableExpense.findMany({
        where: {
          accountId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { category: true },
      })
    } else {
      // Buscar todas as despesas variáveis
      variableExpenses = await prisma.variableExpense.findMany({
        where: { accountId },
        include: { category: true },
      })
    }

    // Agrupar por categoria
    const expensesByCategory: Record<
      string,
      {
        categoryId: string | null
        categoryName: string
        total: number
        count: number
        expenses: Array<{
          id: string
          amount: number
          description: string | null
          date: Date
        }>
      }
    > = {}

    variableExpenses.forEach((expense) => {
      const categoryId = expense.categoryId || 'no-category'
      const categoryName = expense.category?.name || 'Sem categoria'
      const amount = Number(expense.amount)

      if (!expensesByCategory[categoryId]) {
        expensesByCategory[categoryId] = {
          categoryId: expense.categoryId,
          categoryName,
          total: 0,
          count: 0,
          expenses: [],
        }
      }

      expensesByCategory[categoryId].total += amount
      expensesByCategory[categoryId].count += 1
      expensesByCategory[categoryId].expenses.push({
        id: expense.id,
        amount,
        description: expense.description,
        date: expense.date,
      })
    })

    // Converter para array e ordenar por total (decrescente)
    const result = Object.values(expensesByCategory).sort(
      (a, b) => b.total - a.total
    )

    const total = result.reduce((sum, cat) => sum + cat.total, 0)

    return NextResponse.json({
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null,
      categories: result,
      total,
    })
  } catch (error) {
    console.error('Erro ao buscar relatório por categoria:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar relatório por categoria' },
      { status: 500 }
    )
  }
}




