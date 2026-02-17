import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * GET /api/incomes/monthly
 * Calcula a renda mensal total (fixa + extras do mês)
 * US-09: Visualizar renda mensal
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

    // Buscar todas as rendas fixas (sempre são consideradas no mês)
    const fixedIncomes = await prisma.fixedIncome.findMany({
      where: { accountId },
      select: { amount: true },
    })

    // Buscar rendas extras do mês específico
    const extraIncomes = await prisma.extraIncome.findMany({
      where: {
        accountId,
        month: monthNum,
        year: yearNum,
      },
      select: { amount: true },
    })

    // Calcular total
    const fixedTotal = fixedIncomes.reduce(
      (sum, income) => sum + Number(income.amount),
      0
    )
    const extraTotal = extraIncomes.reduce(
      (sum, income) => sum + Number(income.amount),
      0
    )
    const total = fixedTotal + extraTotal

    return NextResponse.json({
      fixedIncome: fixedTotal,
      extraIncome: extraTotal,
      total,
      month: monthNum,
      year: yearNum,
      fixedIncomes: fixedIncomes.map((i) => Number(i.amount)),
      extraIncomes: extraIncomes.map((i) => Number(i.amount)),
    })
  } catch (error) {
    console.error('Erro ao calcular renda mensal:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular renda mensal' },
      { status: 500 }
    )
  }
}




