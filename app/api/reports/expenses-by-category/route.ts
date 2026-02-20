import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange, getActivePiggyBankContributions } from '@/lib/helpers'

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

    // Agrupar por categoria (variáveis + fixas juntas)
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
          date: Date | null
          type: 'variable' | 'fixed'
        }>
      }
    > = {}

    const addToCategory = (
      categoryId: string | null,
      categoryName: string,
      item: { id: string; amount: number; description: string | null; date: Date | null; type: 'variable' | 'fixed' }
    ) => {
      const key = categoryId || 'no-category'
      if (!expensesByCategory[key]) {
        expensesByCategory[key] = { categoryId, categoryName, total: 0, count: 0, expenses: [] }
      }
      expensesByCategory[key].total += item.amount
      expensesByCategory[key].count += 1
      expensesByCategory[key].expenses.push(item)
    }

    variableExpenses.forEach((expense) => {
      addToCategory(
        expense.categoryId,
        expense.category?.name || 'Sem categoria',
        { id: expense.id, amount: Number(expense.amount), description: expense.description, date: expense.date, type: 'variable' }
      )
    })

    // Buscar despesas fixas ativas no mês e agrupar por categoria
    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const { startDate, endDate } = getMonthRange(yearNum, monthNum)

      const fixedExpenses = await prisma.fixedExpense.findMany({
        where: { accountId },
        include: { category: true },
      })

      const activeFixed = fixedExpenses.filter((exp) => {
        const expStart = new Date(exp.startDate)
        const expEnd = exp.endDate ? new Date(exp.endDate) : null
        return expStart <= endDate && (!expEnd || expEnd >= startDate)
      })

      activeFixed.forEach((exp) => {
        addToCategory(
          exp.categoryId,
          exp.category?.name || 'Sem categoria',
          { id: exp.id, amount: Number(exp.amount), description: exp.description, date: null, type: 'fixed' }
        )
      })

      // Buscar contribuições de caixinhas
      const piggyBanks = await prisma.piggyBank.findMany({
        where: { accountId, monthlyContribution: { not: null } },
        include: { skippedMonths: { where: { month: monthNum, year: yearNum } } },
      })

      const activePBs = getActivePiggyBankContributions(piggyBanks, startDate, endDate, monthNum, yearNum)
      const pbTotal = activePBs.reduce((sum, pb) => sum + Number(pb.monthlyContribution), 0)
      const pbItems = activePBs.map((pb) => ({
        id: pb.id,
        description: pb.name,
        amount: Number(pb.monthlyContribution),
      }))

      const result = Object.values(expensesByCategory).sort((a, b) => b.total - a.total)
      const categoryTotal = result.reduce((sum, cat) => sum + cat.total, 0)
      const total = categoryTotal + pbTotal

      return NextResponse.json({
        month: monthNum,
        year: yearNum,
        categories: result,
        piggyBanks: { items: pbItems, total: pbTotal },
        total,
      })
    }

    const result = Object.values(expensesByCategory).sort((a, b) => b.total - a.total)
    const total = result.reduce((sum, cat) => sum + cat.total, 0)

    return NextResponse.json({
      month: null,
      year: null,
      categories: result,
      piggyBanks: { items: [], total: 0 },
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




