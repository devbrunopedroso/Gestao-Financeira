import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { financialGoalSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

async function computeGoalValues(goal: any, accountId: string) {
  const base = {
    id: goal.id,
    name: goal.name,
    type: goal.type,
    targetValue: Number(goal.targetValue),
    currentValue: Number(goal.currentValue),
    deadline: goal.deadline,
    createdAt: goal.createdAt,
  }

  if (goal.type === 'EMERGENCY_FUND') {
    // Target = 6x média despesas mensais (últimos 3 meses)
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const [fixedExpenses, variableExpenses, piggyBanks] = await Promise.all([
      prisma.fixedExpense.findMany({
        where: {
          accountId,
          startDate: { lte: lastMonthEnd },
          OR: [{ endDate: null }, { endDate: { gte: threeMonthsAgo } }],
        },
      }),
      prisma.variableExpense.findMany({
        where: { accountId, date: { gte: threeMonthsAgo, lte: lastMonthEnd } },
      }),
      prisma.piggyBank.findMany({
        where: { accountId, monthlyContribution: { not: null } },
      }),
    ])

    const monthlyFixed = fixedExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalVariable = variableExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const monthlyPB = piggyBanks.reduce((s, pb) => s + Number(pb.monthlyContribution || 0), 0)
    const avgMonthlyExpenses = monthlyFixed + (totalVariable / 3) + monthlyPB
    const target = avgMonthlyExpenses * 6

    // Current = soma de assets POUPANCA + PBs sem asset vinculado
    const [savingsAssets, unlinkedPBs] = await Promise.all([
      prisma.asset.findMany({ where: { accountId, category: 'POUPANCA' } }),
      prisma.piggyBank.findMany({ where: { accountId, asset: null } }),
    ])

    const savingsTotal = savingsAssets.reduce((s, a) =>
      s + (a.status === 'QUITADO' ? Number(a.estimatedValue) : 0), 0)
    const pbTotal = unlinkedPBs.reduce((s, pb) => s + Number(pb.currentAmount), 0)
    const current = savingsTotal + pbTotal

    base.targetValue = Math.round(target * 100) / 100
    base.currentValue = Math.round(current * 100) / 100
  } else if (goal.type === 'SAVINGS_RATE') {
    // Current = taxa de poupança do mês atual
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const [fixedIncomes, extraIncomes, fixedExpenses, variableExpenses, piggyBanks] = await Promise.all([
      prisma.fixedIncome.findMany({ where: { accountId } }),
      prisma.extraIncome.findMany({ where: { accountId, month, year } }),
      prisma.fixedExpense.findMany({
        where: {
          accountId,
          startDate: { lte: endDate },
          OR: [{ endDate: null }, { endDate: { gte: startDate } }],
        },
      }),
      prisma.variableExpense.findMany({ where: { accountId, date: { gte: startDate, lte: endDate } } }),
      prisma.piggyBank.findMany({
        where: { accountId, monthlyContribution: { not: null } },
      }),
    ])

    const totalIncome = fixedIncomes.reduce((s, i) => s + Number(i.amount), 0)
      + extraIncomes.reduce((s, i) => s + Number(i.amount), 0)
    const totalExpenses = fixedExpenses.reduce((s, e) => s + Number(e.amount), 0)
      + variableExpenses.reduce((s, e) => s + Number(e.amount), 0)
      + piggyBanks.reduce((s, pb) => s + Number(pb.monthlyContribution || 0), 0)

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    base.currentValue = Math.round(savingsRate * 10) / 10
  }

  const progress = base.targetValue > 0 ? Math.min(Math.round((base.currentValue / base.targetValue) * 1000) / 10, 100) : 0

  return { ...base, progress }
}

/**
 * GET /api/goals
 * Lista metas financeiras
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    if (!accountId) {
      return NextResponse.json({ message: 'accountId é obrigatório' }, { status: 400 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })
    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const goals = await prisma.financialGoal.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
    })

    const enriched = await Promise.all(goals.map(g => computeGoalValues(g, accountId)))

    return NextResponse.json({ goals: enriched })
  } catch (error) {
    console.error('Erro ao buscar metas:', error)
    return NextResponse.json({ message: 'Erro ao buscar metas' }, { status: 500 })
  }
}

/**
 * POST /api/goals
 * Cria uma nova meta financeira
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await financialGoalSchema.validate(body)
    const { accountId } = validatedData

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })
    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
    }

    const goal = await prisma.financialGoal.create({
      data: {
        accountId,
        name: validatedData.name,
        type: validatedData.type as any,
        targetValue: validatedData.targetValue,
        currentValue: validatedData.currentValue || 0,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
      },
    })

    const enriched = await computeGoalValues(goal, accountId)
    return NextResponse.json(enriched, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar meta:', error)
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    return NextResponse.json({ message: 'Erro ao criar meta' }, { status: 500 })
  }
}
