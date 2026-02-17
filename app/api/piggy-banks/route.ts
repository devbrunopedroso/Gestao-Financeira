import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { piggyBankSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'
import { calculateMonthlyAmount, monthsBetween } from '@/lib/helpers'

/**
 * GET /api/piggy-banks
 * Lista caixinhas de uma conta
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
          take: 5,
        },
        skippedMonths: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calcular valor mensal sugerido para cada caixinha
    const piggyBanksWithMonthly = piggyBanks.map((pb) => {
      const now = new Date()
      const startDate = new Date(pb.startDate)
      let monthsRemaining = 0

      // Calcular meses restantes baseado em endDate ou months
      if (pb.endDate) {
        monthsRemaining = monthsBetween(now, new Date(pb.endDate))
      } else if (pb.months) {
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + pb.months)
        monthsRemaining = monthsBetween(now, endDate)
      }

      const monthlyAmount = calculateMonthlyAmount(
        Number(pb.targetAmount),
        Number(pb.currentAmount),
        monthsRemaining
      )

      return {
        ...pb,
        targetAmount: Number(pb.targetAmount),
        currentAmount: Number(pb.currentAmount),
        monthlyContribution: pb.monthlyContribution ? Number(pb.monthlyContribution) : null,
        suggestedMonthlyAmount: monthlyAmount,
        monthsRemaining,
        progress: Math.min(
          Math.round((Number(pb.currentAmount) / Number(pb.targetAmount)) * 100),
          100
        ),
      }
    })

    return NextResponse.json(piggyBanksWithMonthly)
  } catch (error) {
    console.error('Erro ao buscar caixinhas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar caixinhas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/piggy-banks
 * Cria uma nova caixinha
 * US-20: Criar caixinha com valor objetivo
 * US-21: Definir prazo da caixinha por meses
 * US-22: Definir prazo da caixinha por data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await piggyBankSchema.validate(body)

    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { message: 'accountId é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar permissões
    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    // Validar que tenha endDate OU months, mas não ambos
    if (validatedData.endDate && validatedData.months) {
      return NextResponse.json(
        { message: 'Informe apenas endDate ou months, não ambos' },
        { status: 400 }
      )
    }

    const piggyBank = await prisma.piggyBank.create({
      data: {
        accountId,
        name: validatedData.name,
        description: validatedData.description || null,
        targetAmount: validatedData.targetAmount,
        startDate: new Date(),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        months: validatedData.months || null,
        monthlyContribution: validatedData.monthlyContribution || null,
      },
    })

    // Calcular valor mensal sugerido
    let monthsRemaining = 0
    if (piggyBank.endDate) {
      monthsRemaining = monthsBetween(new Date(), new Date(piggyBank.endDate))
    } else if (piggyBank.months) {
      monthsRemaining = piggyBank.months
    }

    const suggestedMonthlyAmount = calculateMonthlyAmount(
      Number(piggyBank.targetAmount),
      0,
      monthsRemaining
    )

    return NextResponse.json(
      {
        ...piggyBank,
        targetAmount: Number(piggyBank.targetAmount),
        currentAmount: Number(piggyBank.currentAmount),
        suggestedMonthlyAmount,
        monthsRemaining,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro ao criar caixinha:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar caixinha' },
      { status: 500 }
    )
  }
}




