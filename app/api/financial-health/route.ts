import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthRange, isDateInRange } from '@/lib/helpers'

/**
 * GET /api/financial-health
 * Calcula a saúde financeira mensal
 * US-28: Visualizar saúde financeira mensal
 * US-29: Identificar meses críticos (deixa para o frontend fazer comparação)
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

    // Buscar renda mensal
    const fixedIncomes = await prisma.fixedIncome.findMany({
      where: { accountId },
      select: { amount: true },
    })

    const extraIncomes = await prisma.extraIncome.findMany({
      where: {
        accountId,
        month: monthNum,
        year: yearNum,
      },
      select: { amount: true },
    })

    const totalIncome =
      fixedIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0) +
      extraIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0)

    // Buscar despesas fixas ativas no mês
    const { startDate, endDate } = getMonthRange(yearNum, monthNum)
    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: { accountId },
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

    // Buscar despesas variáveis do mês
    const variableExpenses = await prisma.variableExpense.findMany({
      where: {
        accountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { amount: true },
    })

    const totalVariableExpenses = variableExpenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    )

    const totalExpenses = totalFixedExpenses + totalVariableExpenses

    // Calcular saldo
    const balance = totalIncome - totalExpenses

    // Calcular saúde financeira (percentual de comprometimento)
    // 0-50%: Excelente (verde)
    // 51-80%: Boa (amarelo)
    // 81-100%: Atenção (laranja)
    // >100%: Crítico (vermelho)
    let healthStatus: 'excellent' | 'good' | 'warning' | 'critical'
    let healthPercentage = 0

    if (totalIncome > 0) {
      healthPercentage = (totalExpenses / totalIncome) * 100

      if (healthPercentage <= 50) {
        healthStatus = 'excellent'
      } else if (healthPercentage <= 80) {
        healthStatus = 'good'
      } else if (healthPercentage <= 100) {
        healthStatus = 'warning'
      } else {
        healthStatus = 'critical'
      }
    } else {
      // Sem renda, mas tem despesas = crítico
      healthStatus = totalExpenses > 0 ? 'critical' : 'excellent'
      healthPercentage = totalExpenses > 0 ? 100 : 0
    }

    return NextResponse.json({
      month: monthNum,
      year: yearNum,
      income: totalIncome,
      expenses: totalExpenses,
      fixedExpenses: totalFixedExpenses,
      variableExpenses: totalVariableExpenses,
      balance,
      healthStatus,
      healthPercentage: Math.round(healthPercentage * 100) / 100,
    })
  } catch (error) {
    console.error('Erro ao calcular saúde financeira:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular saúde financeira' },
      { status: 500 }
    )
  }
}




