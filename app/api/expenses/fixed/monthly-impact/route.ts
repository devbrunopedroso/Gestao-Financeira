import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange, getActivePiggyBankContributions } from '@/lib/helpers'

/**
 * GET /api/expenses/fixed/monthly-impact
 * Calcula o impacto mensal das despesas fixas
 * US-13: Visualizar impacto das despesas fixas
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

    // Buscar todas as despesas fixas da conta
    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: { accountId },
      include: { category: true },
    })

    // Filtrar despesas que estão ativas no mês específico
    const { startDate, endDate } = getMonthRange(yearNum, monthNum)
    
    const activeExpenses = fixedExpenses.filter((expense) => {
      const expenseStart = new Date(expense.startDate)
      const expenseEnd = expense.endDate ? new Date(expense.endDate) : null

      // Verificar se a despesa está ativa no mês
      // Despesa está ativa se: startDate <= fim do mês E (endDate é null OU endDate >= início do mês)
      const isActiveInMonth =
        expenseStart <= endDate &&
        (!expenseEnd || expenseEnd >= startDate)

      return isActiveInMonth
    })

    // Calcular total despesas fixas
    const fixedTotal = activeExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    )

    // Buscar caixinhas com contribuicao mensal
    const piggyBanks = await prisma.piggyBank.findMany({
      where: { accountId, monthlyContribution: { not: null } },
      include: { skippedMonths: { where: { month: monthNum, year: yearNum } } },
    })

    const activePBs = getActivePiggyBankContributions(piggyBanks, startDate, endDate, monthNum, yearNum)
    const pbTotal = activePBs.reduce((sum, pb) => sum + Number(pb.monthlyContribution), 0)

    return NextResponse.json({
      month: monthNum,
      year: yearNum,
      total: fixedTotal + pbTotal,
      activeExpenses: activeExpenses.map((exp) => ({
        id: exp.id,
        amount: Number(exp.amount),
        description: exp.description,
        category: exp.category,
      })),
      piggyBankExpenses: activePBs.map((pb) => ({
        id: pb.id,
        amount: Number(pb.monthlyContribution),
        description: `Caixinha: ${pb.name}`,
        isPiggyBank: true,
      })),
    })
  } catch (error) {
    console.error('Erro ao calcular impacto mensal:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular impacto mensal' },
      { status: 500 }
    )
  }
}




