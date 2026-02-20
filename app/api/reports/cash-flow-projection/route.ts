import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActivePiggyBankContributions } from '@/lib/helpers'

const MONTHS_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/**
 * GET /api/reports/cash-flow-projection
 * Projeta fluxo de caixa para os próximos meses
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const monthsAhead = Number(searchParams.get('months') || '6')

    if (!accountId) {
      return NextResponse.json({ message: 'accountId é obrigatório' }, { status: 400 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })
    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    // Dados base
    const [fixedIncomes, fixedExpenses, piggyBanks] = await Promise.all([
      prisma.fixedIncome.findMany({ where: { accountId } }),
      prisma.fixedExpense.findMany({ where: { accountId } }),
      prisma.piggyBank.findMany({
        where: { accountId, monthlyContribution: { not: null } },
        include: { skippedMonths: true },
      }),
    ])

    const totalFixedIncome = fixedIncomes.reduce((s, i) => s + Number(i.amount), 0)

    // Média de despesas variáveis dos últimos 3 meses
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const variableExpenses = await prisma.variableExpense.findMany({
      where: {
        accountId,
        date: { gte: threeMonthsAgo, lte: lastMonthEnd },
      },
    })

    const totalVariable3m = variableExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const monthsWithData = Math.min(3, Math.max(1, Math.ceil(
      (lastMonthEnd.getTime() - threeMonthsAgo.getTime()) / (30 * 24 * 60 * 60 * 1000)
    )))
    const avgVariable = totalVariable3m / monthsWithData

    // Projetar meses futuros
    const projections = []
    let cumulativeBalance = 0

    for (let i = 1; i <= monthsAhead; i++) {
      const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const projMonth = projDate.getMonth() + 1
      const projYear = projDate.getFullYear()
      const startDate = new Date(projYear, projMonth - 1, 1)
      const endDate = new Date(projYear, projMonth, 0, 23, 59, 59, 999)

      // Despesas fixas ativas neste mês
      const activeFixed = fixedExpenses.filter(e => {
        const start = new Date(e.startDate)
        if (start > endDate) return false
        if (e.endDate && new Date(e.endDate) < startDate) return false
        return true
      })
      const totalFixed = activeFixed.reduce((s, e) => s + Number(e.amount), 0)

      // PiggyBank contributions ativas
      const activePBs = getActivePiggyBankContributions(piggyBanks, startDate, endDate, projMonth, projYear)
      const totalPB = activePBs.reduce((s, pb) => s + Number(pb.monthlyContribution), 0)

      const totalExpenses = totalFixed + totalPB + avgVariable
      const balance = totalFixedIncome - totalExpenses
      cumulativeBalance += balance

      projections.push({
        month: projMonth,
        year: projYear,
        label: `${MONTHS_LABELS[projMonth - 1]}/${String(projYear).slice(2)}`,
        income: Math.round(totalFixedIncome * 100) / 100,
        fixedExpenses: Math.round(totalFixed * 100) / 100,
        pbExpenses: Math.round(totalPB * 100) / 100,
        avgVariable: Math.round(avgVariable * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        cumulativeBalance: Math.round(cumulativeBalance * 100) / 100,
      })
    }

    return NextResponse.json({
      projections,
      assumptions: {
        fixedIncomeTotal: Math.round(totalFixedIncome * 100) / 100,
        avgVariableMonths: monthsWithData,
        avgVariableTotal: Math.round(avgVariable * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Erro ao projetar fluxo de caixa:', error)
    return NextResponse.json(
      { message: 'Erro ao projetar fluxo de caixa' },
      { status: 500 }
    )
  }
}
