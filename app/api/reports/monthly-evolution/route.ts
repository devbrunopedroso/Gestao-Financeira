import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange } from '@/lib/helpers'

/**
 * GET /api/reports/monthly-evolution
 * Retorna evolução financeira ao longo dos meses
 * US-31: Visualizar evolução mensal
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const startMonth = searchParams.get('startMonth')
    const startYear = searchParams.get('startYear')
    const endMonth = searchParams.get('endMonth')
    const endYear = searchParams.get('endYear')

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

    // Definir período padrão (últimos 12 meses se não especificado)
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (startMonth && startYear && endMonth && endYear) {
      const { startDate: sd } = getMonthRange(
        parseInt(startYear),
        parseInt(startMonth)
      )
      const { endDate: ed } = getMonthRange(
        parseInt(endYear),
        parseInt(endMonth)
      )
      startDate = sd
      endDate = ed
    } else {
      // Últimos 12 meses
      endDate = now
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 12)
    }

    // Buscar todas as rendas fixas (sempre consideradas)
    const fixedIncomes = await prisma.fixedIncome.findMany({
      where: { accountId },
    })

    const fixedIncomeTotal = fixedIncomes.reduce(
      (sum, inc) => sum + Number(inc.amount),
      0
    )

    // Buscar rendas extras no período
    const extraIncomes = await prisma.extraIncome.findMany({
      where: { accountId },
    })

    // Buscar despesas fixas
    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: { accountId },
    })

    // Buscar despesas variáveis no período
    const variableExpenses = await prisma.variableExpense.findMany({
      where: {
        accountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Agrupar por mês
    const monthlyData: Record<
      string,
      {
        month: number
        year: number
        income: number
        expenses: number
        balance: number
      }
    > = {}

    // Inicializar todos os meses no período
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const key = `${year}-${month.toString().padStart(2, '0')}`

      monthlyData[key] = {
        month,
        year,
        income: fixedIncomeTotal,
        expenses: 0,
        balance: fixedIncomeTotal,
      }

      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // Adicionar rendas extras
    extraIncomes.forEach((income) => {
      const key = `${income.year}-${income.month.toString().padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].income += Number(income.amount)
        monthlyData[key].balance += Number(income.amount)
      }
    })

    // Adicionar despesas fixas (verificar se estão ativas em cada mês)
    Object.keys(monthlyData).forEach((key) => {
      const [year, month] = key.split('-').map(Number)
      const { startDate: monthStart, endDate: monthEnd } = getMonthRange(
        year,
        month
      )

      fixedExpenses.forEach((expense) => {
        const expStart = new Date(expense.startDate)
        const expEnd = expense.endDate ? new Date(expense.endDate) : null

        if (expStart <= monthEnd && (!expEnd || expEnd >= monthStart)) {
          monthlyData[key].expenses += Number(expense.amount)
          monthlyData[key].balance -= Number(expense.amount)
        }
      })
    })

    // Adicionar despesas variáveis
    variableExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date)
      const month = expenseDate.getMonth() + 1
      const year = expenseDate.getFullYear()
      const key = `${year}-${month.toString().padStart(2, '0')}`

      if (monthlyData[key]) {
        monthlyData[key].expenses += Number(expense.amount)
        monthlyData[key].balance -= Number(expense.amount)
      }
    })

    // Converter para array e ordenar
    const result = Object.values(monthlyData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    return NextResponse.json({
      startDate,
      endDate,
      evolution: result,
    })
  } catch (error) {
    console.error('Erro ao buscar evolução mensal:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar evolução mensal' },
      { status: 500 }
    )
  }
}




