import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange, getActivePiggyBankContributions } from '@/lib/helpers'

/**
 * GET /api/financial-score
 * Calcula score financeiro de 0-1000 baseado em 5 pilares
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    if (!accountId) {
      return NextResponse.json({ message: 'accountId é obrigatório' }, { status: 400 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })
    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { startDate, endDate } = getMonthRange(year, month)

    // ===== Buscar dados =====

    // Rendas
    const fixedIncomes = await prisma.fixedIncome.findMany({ where: { accountId } })
    const extraIncomes = await prisma.extraIncome.findMany({
      where: { accountId, month, year },
    })
    const totalIncome = fixedIncomes.reduce((s, i) => s + Number(i.amount), 0)
      + extraIncomes.reduce((s, i) => s + Number(i.amount), 0)

    // Despesas fixas ativas
    const fixedExpenses = await prisma.fixedExpense.findMany({ where: { accountId } })
    const activeFixed = fixedExpenses.filter(exp => {
      const s = new Date(exp.startDate)
      const e = exp.endDate ? new Date(exp.endDate) : null
      return s <= endDate && (!e || e >= startDate)
    })
    const totalFixedExpenses = activeFixed.reduce((s, e) => s + Number(e.amount), 0)

    // Despesas variaveis
    const variableExpenses = await prisma.variableExpense.findMany({
      where: { accountId, date: { gte: startDate, lte: endDate } },
    })
    const totalVariableExpenses = variableExpenses.reduce((s, e) => s + Number(e.amount), 0)

    // PiggyBanks
    const piggyBanks = await prisma.piggyBank.findMany({
      where: { accountId, monthlyContribution: { not: null } },
      include: { skippedMonths: { where: { month, year } } },
    })
    const activePBs = getActivePiggyBankContributions(piggyBanks, startDate, endDate, month, year)
    const totalPBExpenses = activePBs.reduce((s, pb) => s + Number(pb.monthlyContribution), 0)

    const totalExpenses = totalFixedExpenses + totalVariableExpenses + totalPBExpenses

    // ===== PILAR 1: Poupanca (200pts) =====
    let savingsScore = 0
    let savingsDetail = ''
    if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100
      if (savingsRate >= 20) savingsScore = 200
      else if (savingsRate >= 10) savingsScore = 150
      else if (savingsRate >= 5) savingsScore = 100
      else if (savingsRate >= 0) savingsScore = 50
      savingsDetail = `Taxa: ${savingsRate.toFixed(1)}%`
    } else {
      savingsDetail = 'Sem receita no mes'
    }

    // ===== PILAR 2: Orcamento (200pts) =====
    let budgetScore = 0
    let budgetDetail = ''
    const budgets = await prisma.categoryBudget.findMany({
      where: { accountId, month, year },
    })
    if (budgets.length > 0) {
      const varByCategory = await prisma.variableExpense.groupBy({
        by: ['categoryId'],
        where: { accountId, date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      })
      const spentMap = new Map(varByCategory.map(v => [v.categoryId, Number(v._sum.amount || 0)]))

      let totalCompliance = 0
      for (const b of budgets) {
        const spent = spentMap.get(b.categoryId) || 0
        const budgetAmt = Number(b.amount)
        if (budgetAmt > 0) {
          const pct = spent / budgetAmt
          totalCompliance += pct <= 1 ? 1 : Math.max(0, 2 - pct) // 1 = dentro, decresce apos
        }
      }
      const avgCompliance = totalCompliance / budgets.length
      budgetScore = Math.round(avgCompliance * 200)
      budgetDetail = `${budgets.length} categorias com orcamento`
    } else {
      budgetScore = 100 // Neutro se nao tem orcamento
      budgetDetail = 'Sem orcamento definido'
    }

    // ===== PILAR 3: Reserva de Emergencia (200pts) =====
    let reserveScore = 0
    let reserveDetail = ''
    const emergencyGoal = await prisma.financialGoal.findFirst({
      where: { accountId, type: 'EMERGENCY_FUND' },
    })
    if (emergencyGoal) {
      // Calcular target (6x media despesas)
      const threeMonthsAgo = new Date(year, month - 4, 1)
      const lastMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999)
      const recentVar = await prisma.variableExpense.aggregate({
        where: { accountId, date: { gte: threeMonthsAgo, lte: lastMonthEnd } },
        _sum: { amount: true },
      })
      const avgMonthlyExpenses = (Number(recentVar._sum?.amount || 0) / 3) + totalFixedExpenses
      const target = avgMonthlyExpenses * 6

      // Current = POUPANCA assets + unlinked PBs
      const savingsAssets = await prisma.asset.findMany({
        where: { accountId, category: 'POUPANCA', status: 'QUITADO' },
      })
      const allPBs = await prisma.piggyBank.findMany({
        where: { accountId, asset: { is: null } },
      })
      const currentReserve = savingsAssets.reduce((s, a) => s + Number(a.estimatedValue), 0)
        + allPBs.reduce((s, pb) => s + Number(pb.currentAmount), 0)

      if (target > 0) {
        const progress = Math.min(currentReserve / target, 1)
        reserveScore = Math.round(progress * 200)
        reserveDetail = `${(progress * 100).toFixed(0)}% da reserva ideal`
      }
    } else {
      reserveScore = 0
      reserveDetail = 'Sem meta de reserva definida'
    }

    // ===== PILAR 4: Diversificacao (200pts) =====
    let diversificationScore = 0
    let diversificationDetail = ''
    const assets = await prisma.asset.findMany({
      where: { accountId },
      select: { category: true },
    })
    const uniqueCategories = new Set(assets.map(a => a.category))
    const catCount = uniqueCategories.size
    if (catCount >= 5) diversificationScore = 200
    else if (catCount >= 4) diversificationScore = 160
    else if (catCount >= 3) diversificationScore = 120
    else if (catCount >= 2) diversificationScore = 80
    else if (catCount >= 1) diversificationScore = 40
    diversificationDetail = `${catCount} categoria${catCount !== 1 ? 's' : ''} de ativos`

    // ===== PILAR 5: Habitos (200pts) =====
    let habitsScore = 0
    let habitsDetail = ''

    // Fixas < 50% da receita = 100pts
    if (totalIncome > 0 && totalFixedExpenses / totalIncome < 0.5) {
      habitsScore += 100
    } else if (totalIncome > 0) {
      habitsScore += Math.round(Math.max(0, (1 - totalFixedExpenses / totalIncome)) * 100)
    }

    // Variaveis <= media 3 meses = 100pts
    const threeMonthsAgo2 = new Date(year, month - 4, 1)
    const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999)
    const prevVar = await prisma.variableExpense.aggregate({
      where: { accountId, date: { gte: threeMonthsAgo2, lte: prevMonthEnd } },
      _sum: { amount: true },
    })
    const avgPrevVariable = Number(prevVar._sum?.amount || 0) / 3
    if (avgPrevVariable > 0 && totalVariableExpenses <= avgPrevVariable) {
      habitsScore += 100
    } else if (avgPrevVariable > 0) {
      const ratio = totalVariableExpenses / avgPrevVariable
      habitsScore += Math.round(Math.max(0, (2 - ratio)) * 100)
    } else {
      habitsScore += 50 // Neutro
    }
    habitsDetail = `Fixas: ${totalIncome > 0 ? ((totalFixedExpenses / totalIncome) * 100).toFixed(0) : 0}% da renda`

    // ===== Total =====
    const totalScore = savingsScore + budgetScore + reserveScore + diversificationScore + habitsScore

    let level: string
    if (totalScore >= 801) level = 'Excelente'
    else if (totalScore >= 601) level = 'Bom'
    else if (totalScore >= 401) level = 'Regular'
    else if (totalScore >= 201) level = 'Ruim'
    else level = 'Critico'

    return NextResponse.json({
      score: totalScore,
      maxScore: 1000,
      level,
      pillars: [
        { name: 'Poupanca', score: savingsScore, max: 200, detail: savingsDetail },
        { name: 'Orcamento', score: budgetScore, max: 200, detail: budgetDetail },
        { name: 'Reserva', score: reserveScore, max: 200, detail: reserveDetail },
        { name: 'Diversificacao', score: diversificationScore, max: 200, detail: diversificationDetail },
        { name: 'Habitos', score: habitsScore, max: 200, detail: habitsDetail },
      ],
    })
  } catch (error) {
    console.error('Erro ao calcular score:', error)
    return NextResponse.json({ message: 'Erro ao calcular score' }, { status: 500 })
  }
}
