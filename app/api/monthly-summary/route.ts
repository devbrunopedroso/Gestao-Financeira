import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange, getActivePiggyBankContributions } from '@/lib/helpers'

/**
 * GET /api/monthly-summary
 * Retorna resumo financeiro completo do mês
 * US-35: Visualizar resumo mensal
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

    if (!accountId || !month || !year) {
      return NextResponse.json(
        { message: 'accountId, month e year são obrigatórios' },
        { status: 400 }
      )
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

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

    // Buscar rendas
    const fixedIncomes = await prisma.fixedIncome.findMany({
      where: { accountId },
    })

    const extraIncomes = await prisma.extraIncome.findMany({
      where: {
        accountId,
        month: monthNum,
        year: yearNum,
      },
    })

    const totalIncome =
      fixedIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0) +
      extraIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0)

    // Buscar despesas fixas ativas
    const { startDate, endDate } = getMonthRange(yearNum, monthNum)
    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: { accountId },
      include: { category: true },
    })

    const activeFixedExpenses = fixedExpenses.filter((exp) => {
      const expStart = new Date(exp.startDate)
      const expEnd = exp.endDate ? new Date(exp.endDate) : null
      return expStart <= endDate && (!expEnd || expEnd >= startDate)
    })

    const totalFixedExpenses = activeFixedExpenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    )

    // Buscar despesas variáveis
    const variableExpenses = await prisma.variableExpense.findMany({
      where: {
        accountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { category: true },
    })

    const totalVariableExpenses = variableExpenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    )

    // Buscar caixinhas com contribuicao mensal
    const piggyBanks = await prisma.piggyBank.findMany({
      where: { accountId, monthlyContribution: { not: null } },
      include: { skippedMonths: { where: { month: monthNum, year: yearNum } } },
    })

    const activePBs = getActivePiggyBankContributions(piggyBanks, startDate, endDate, monthNum, yearNum)
    const totalPBExpenses = activePBs.reduce((sum, pb) => sum + Number(pb.monthlyContribution), 0)

    const totalExpenses = totalFixedExpenses + totalVariableExpenses + totalPBExpenses
    const balance = totalIncome - totalExpenses

    // Agrupar despesas variáveis por categoria
    const expensesByCategory: Record<string, number> = {}
    variableExpenses.forEach((exp) => {
      const categoryName = exp.category?.name || 'Sem categoria'
      expensesByCategory[categoryName] =
        (expensesByCategory[categoryName] || 0) + Number(exp.amount)
    })

    return NextResponse.json({
      month: monthNum,
      year: yearNum,
      income: {
        fixed: fixedIncomes.map((inc) => Number(inc.amount)),
        extra: extraIncomes.map((inc) => Number(inc.amount)),
        total: totalIncome,
      },
      expenses: {
        fixed: {
          items: activeFixedExpenses.map((exp) => ({
            id: exp.id,
            amount: Number(exp.amount),
            description: exp.description,
            category: exp.category,
          })),
          total: totalFixedExpenses,
        },
        variable: {
          items: variableExpenses.map((exp) => ({
            id: exp.id,
            amount: Number(exp.amount),
            description: exp.description,
            date: exp.date,
            category: exp.category,
          })),
          total: totalVariableExpenses,
          byCategory: expensesByCategory,
        },
        piggyBanks: {
          items: activePBs.map((pb) => ({
            id: pb.id,
            amount: Number(pb.monthlyContribution),
            description: `Caixinha: ${pb.name}`,
          })),
          total: totalPBExpenses,
        },
        total: totalExpenses,
      },
      balance,
      health: {
        percentage: totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0,
        status:
          totalIncome === 0
            ? 'excellent'
            : totalExpenses / totalIncome <= 0.5
            ? 'excellent'
            : totalExpenses / totalIncome <= 0.8
            ? 'good'
            : totalExpenses / totalIncome <= 1.0
            ? 'warning'
            : 'critical',
      },
    })
  } catch (error) {
    console.error('Erro ao buscar resumo mensal:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar resumo mensal' },
      { status: 500 }
    )
  }
}




