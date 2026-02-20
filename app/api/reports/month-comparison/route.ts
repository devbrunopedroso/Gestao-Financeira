import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActivePiggyBankContributions } from '@/lib/helpers'

function getMonthRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)
  return { startDate, endDate }
}

async function getMonthData(accountId: string, month: number, year: number) {
  const { startDate, endDate } = getMonthRange(year, month)

  // Receitas
  const [fixedIncomes, extraIncomes] = await Promise.all([
    prisma.fixedIncome.findMany({ where: { accountId } }),
    prisma.extraIncome.findMany({ where: { accountId, month, year } }),
  ])

  const totalFixedIncome = fixedIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const totalExtraIncome = extraIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const totalIncome = totalFixedIncome + totalExtraIncome

  // Despesas fixas ativas no mês
  const fixedExpenses = await prisma.fixedExpense.findMany({
    where: {
      accountId,
      startDate: { lte: endDate },
      OR: [{ endDate: null }, { endDate: { gte: startDate } }],
    },
  })
  const totalFixed = fixedExpenses.reduce((s, e) => s + Number(e.amount), 0)

  // Despesas variáveis por categoria
  const variableExpenses = await prisma.variableExpense.findMany({
    where: { accountId, date: { gte: startDate, lte: endDate } },
    include: { category: true },
  })

  const byCategory: Record<string, { name: string; total: number }> = {}
  variableExpenses.forEach(e => {
    const catName = e.category?.name || 'Sem categoria'
    const catId = e.categoryId || 'none'
    if (!byCategory[catId]) byCategory[catId] = { name: catName, total: 0 }
    byCategory[catId].total += Number(e.amount)
  })

  const totalVariable = variableExpenses.reduce((s, e) => s + Number(e.amount), 0)

  // PiggyBank contributions
  const piggyBanks = await prisma.piggyBank.findMany({
    where: { accountId, monthlyContribution: { not: null } },
    include: { skippedMonths: true },
  })
  const activePBs = getActivePiggyBankContributions(piggyBanks, startDate, endDate, month, year)
  const totalPB = activePBs.reduce((s, pb) => s + Number(pb.monthlyContribution), 0)

  const totalExpenses = totalFixed + totalVariable + totalPB

  return {
    month, year,
    income: totalIncome,
    expenses: totalExpenses,
    balance: totalIncome - totalExpenses,
    byCategory: Object.entries(byCategory).map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      total: data.total,
    })),
    fixedExpenses: totalFixed,
    variableExpenses: totalVariable,
    piggyBankExpenses: totalPB,
  }
}

/**
 * GET /api/reports/month-comparison
 * Compara dois meses lado a lado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const month1 = Number(searchParams.get('month1'))
    const year1 = Number(searchParams.get('year1'))
    const month2 = Number(searchParams.get('month2'))
    const year2 = Number(searchParams.get('year2'))

    if (!accountId || !month1 || !year1 || !month2 || !year2) {
      return NextResponse.json(
        { message: 'accountId, month1, year1, month2, year2 são obrigatórios' },
        { status: 400 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })
    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const [data1, data2] = await Promise.all([
      getMonthData(accountId, month1, year1),
      getMonthData(accountId, month2, year2),
    ])

    // Comparação por categoria
    const allCategories = new Set([
      ...data1.byCategory.map(c => c.categoryId),
      ...data2.byCategory.map(c => c.categoryId),
    ])

    const changes = Array.from(allCategories).map(catId => {
      const cat1 = data1.byCategory.find(c => c.categoryId === catId)
      const cat2 = data2.byCategory.find(c => c.categoryId === catId)
      const m1Value = cat1?.total || 0
      const m2Value = cat2?.total || 0
      const change = m2Value - m1Value
      const changePercent = m1Value > 0 ? (change / m1Value) * 100 : (m2Value > 0 ? 100 : 0)
      return {
        categoryId: catId,
        categoryName: cat1?.categoryName || cat2?.categoryName || 'Sem categoria',
        month1Value: m1Value,
        month2Value: m2Value,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
      }
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

    const increases = changes.filter(c => c.change > 0)
    const savings = changes.filter(c => c.change < 0)

    return NextResponse.json({
      month1: data1,
      month2: data2,
      changes,
      biggestIncrease: increases.length > 0 ? increases[0] : null,
      biggestSaving: savings.length > 0 ? savings[0] : null,
    })
  } catch (error) {
    console.error('Erro ao comparar meses:', error)
    return NextResponse.json(
      { message: 'Erro ao comparar meses' },
      { status: 500 }
    )
  }
}
