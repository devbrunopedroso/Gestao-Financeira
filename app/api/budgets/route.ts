import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { categoryBudgetSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * GET /api/budgets
 * Lista orçamentos por categoria de um mês/ano
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const month = Number(searchParams.get('month'))
    const year = Number(searchParams.get('year'))

    if (!accountId || !month || !year) {
      return NextResponse.json(
        { message: 'accountId, month e year são obrigatórios' },
        { status: 400 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })

    if (!membership) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    // Buscar orçamentos do mês
    const budgets = await prisma.categoryBudget.findMany({
      where: { accountId, month, year },
      include: { category: true },
    })

    // Buscar gastos reais do mês por categoria
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const expenses = await prisma.variableExpense.groupBy({
      by: ['categoryId'],
      where: {
        accountId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    })

    const expenseMap: Record<string, number> = {}
    expenses.forEach(e => {
      if (e.categoryId) {
        expenseMap[e.categoryId] = Number(e._sum.amount || 0)
      }
    })

    const result = budgets.map(b => {
      const budgetAmount = Number(b.amount)
      const actualAmount = expenseMap[b.categoryId] || 0
      const percentage = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryColor: b.category.color,
        categoryIcon: b.category.icon,
        budgetAmount,
        actualAmount,
        percentage: Math.round(percentage * 10) / 10,
        status: percentage < 80 ? 'green' : percentage <= 100 ? 'warning' : 'danger',
      }
    })

    const totalBudget = result.reduce((s, b) => s + b.budgetAmount, 0)
    const totalActual = result.reduce((s, b) => s + b.actualAmount, 0)

    return NextResponse.json({ budgets: result, totalBudget, totalActual })
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar orçamentos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/budgets
 * Cria ou atualiza um orçamento por categoria (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await categoryBudgetSchema.validate(body)

    const { accountId } = validatedData

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId } },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const budget = await prisma.categoryBudget.upsert({
      where: {
        categoryId_accountId_month_year: {
          categoryId: validatedData.categoryId,
          accountId,
          month: validatedData.month,
          year: validatedData.year,
        },
      },
      update: { amount: validatedData.amount },
      create: {
        categoryId: validatedData.categoryId,
        accountId,
        amount: validatedData.amount,
        month: validatedData.month,
        year: validatedData.year,
      },
    })

    return NextResponse.json(
      { ...budget, amount: Number(budget.amount) },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro ao salvar orçamento:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { message: 'Erro ao salvar orçamento' },
      { status: 500 }
    )
  }
}
