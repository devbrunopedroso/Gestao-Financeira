import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateProgress } from '@/lib/helpers'

/**
 * GET /api/reports/piggy-banks-progress
 * Retorna progresso das caixinhas
 * US-32: Visualizar progresso dos objetivos
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
      return NextResponse.json(
        { message: 'accountId é obrigatório' },
        { status: 400 }
      )
    }

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

    const piggyBanks = await prisma.piggyBank.findMany({
      where: { accountId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const progressData = piggyBanks.map((pb) => {
      const currentAmount = Number(pb.currentAmount)
      const targetAmount = Number(pb.targetAmount)
      const progress = calculateProgress(currentAmount, targetAmount)

      // Calcular total de aportes e retiradas
      const deposits = pb.transactions
        .filter((t) => t.type === 'DEPOSIT')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const withdrawals = pb.transactions
        .filter((t) => t.type === 'WITHDRAWAL')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      return {
        id: pb.id,
        name: pb.name,
        description: pb.description,
        targetAmount,
        currentAmount,
        progress,
        remainingAmount: Math.max(0, targetAmount - currentAmount),
        deposits,
        withdrawals,
        transactionsCount: pb.transactions.length,
        startDate: pb.startDate,
        endDate: pb.endDate,
        months: pb.months,
      }
    })

    return NextResponse.json({
      piggyBanks: progressData,
      total: progressData.length,
      completed: progressData.filter((p) => p.progress >= 100).length,
      inProgress: progressData.filter((p) => p.progress > 0 && p.progress < 100)
        .length,
      notStarted: progressData.filter((p) => p.progress === 0).length,
    })
  } catch (error) {
    console.error('Erro ao buscar progresso das caixinhas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar progresso das caixinhas' },
      { status: 500 }
    )
  }
}




