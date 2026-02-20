import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/overview
 * Estatisticas gerais do sistema
 */
export async function GET() {
  try {
    const isAdmin = await verifyAdminToken()
    if (!isAdmin) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const [
      totalUsers,
      totalAccounts,
      totalFixedExpenses,
      totalVariableExpenses,
      totalFixedIncomes,
      totalExtraIncomes,
      totalPiggyBanks,
      totalAssets,
      totalGoals,
      totalCategories,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.financialAccount.count(),
      prisma.fixedExpense.count(),
      prisma.variableExpense.count(),
      prisma.fixedIncome.count(),
      prisma.extraIncome.count(),
      prisma.piggyBank.count(),
      prisma.asset.count(),
      prisma.financialGoal.count(),
      prisma.category.count(),
    ])

    // Total patrimonio
    const assetsSum = await prisma.asset.aggregate({
      _sum: { estimatedValue: true },
    })

    // Usuarios com login nos ultimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeUsers = await prisma.session.findMany({
      where: { expires: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    })

    return NextResponse.json({
      users: { total: totalUsers, active: activeUsers.length },
      accounts: totalAccounts,
      expenses: { fixed: totalFixedExpenses, variable: totalVariableExpenses, total: totalFixedExpenses + totalVariableExpenses },
      incomes: { fixed: totalFixedIncomes, extra: totalExtraIncomes, total: totalFixedIncomes + totalExtraIncomes },
      piggyBanks: totalPiggyBanks,
      assets: { total: totalAssets, totalValue: Number(assetsSum._sum?.estimatedValue || 0) },
      goals: totalGoals,
      categories: totalCategories,
    })
  } catch (error) {
    console.error('Erro ao buscar overview:', error)
    return NextResponse.json({ message: 'Erro ao buscar overview' }, { status: 500 })
  }
}
