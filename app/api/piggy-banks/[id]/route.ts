import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { piggyBankSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'
import { calculateMonthlyAmount, monthsBetween } from '@/lib/helpers'

/**
 * GET /api/piggy-banks/[id]
 * Busca uma caixinha específica com todas as transações
 * US-27: Visualizar progresso da caixinha
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const piggyBank = await prisma.piggyBank.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
        },
        skippedMonths: true,
      },
    })

    if (!piggyBank) {
      return NextResponse.json(
        { message: 'Caixinha não encontrada' },
        { status: 404 }
      )
    }

    // Verificar acesso
    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: piggyBank.accountId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { message: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Calcular valor mensal sugerido e progresso
    const now = new Date()
    const startDate = new Date(piggyBank.startDate)
    let monthsRemaining = 0

    if (piggyBank.endDate) {
      monthsRemaining = monthsBetween(now, new Date(piggyBank.endDate))
    } else if (piggyBank.months) {
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + piggyBank.months)
      monthsRemaining = monthsBetween(now, endDate)
    }

    const suggestedMonthlyAmount = calculateMonthlyAmount(
      Number(piggyBank.targetAmount),
      Number(piggyBank.currentAmount),
      monthsRemaining
    )

    const progress = Math.min(
      Math.round((Number(piggyBank.currentAmount) / Number(piggyBank.targetAmount)) * 100),
      100
    )

    return NextResponse.json({
      ...piggyBank,
      targetAmount: Number(piggyBank.targetAmount),
      currentAmount: Number(piggyBank.currentAmount),
      monthlyContribution: piggyBank.monthlyContribution ? Number(piggyBank.monthlyContribution) : null,
      suggestedMonthlyAmount,
      monthsRemaining,
      progress,
      transactions: piggyBank.transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    })
  } catch (error) {
    console.error('Erro ao buscar caixinha:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar caixinha' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/piggy-banks/[id]
 * Edita uma caixinha
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = await piggyBankSchema.validate(body)

    const piggyBank = await prisma.piggyBank.findUnique({
      where: { id },
    })

    if (!piggyBank) {
      return NextResponse.json(
        { message: 'Caixinha não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: piggyBank.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const updated = await prisma.piggyBank.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        targetAmount: validatedData.targetAmount,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        months: validatedData.months || null,
        monthlyContribution: validatedData.monthlyContribution || null,
      },
    })

    // Recalcular valor mensal
    const now = new Date()
    let monthsRemaining = 0
    if (updated.endDate) {
      monthsRemaining = monthsBetween(now, new Date(updated.endDate))
    } else if (updated.months) {
      const startDate = new Date(updated.startDate)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + updated.months)
      monthsRemaining = monthsBetween(now, endDate)
    }

    const suggestedMonthlyAmount = calculateMonthlyAmount(
      Number(updated.targetAmount),
      Number(updated.currentAmount),
      monthsRemaining
    )

    return NextResponse.json({
      ...updated,
      targetAmount: Number(updated.targetAmount),
      currentAmount: Number(updated.currentAmount),
      suggestedMonthlyAmount,
      monthsRemaining,
    })
  } catch (error: any) {
    console.error('Erro ao editar caixinha:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao editar caixinha' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/piggy-banks/[id]
 * Exclui uma caixinha
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const piggyBank = await prisma.piggyBank.findUnique({
      where: { id },
    })

    if (!piggyBank) {
      return NextResponse.json(
        { message: 'Caixinha não encontrada' },
        { status: 404 }
      )
    }

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: piggyBank.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    await prisma.piggyBank.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Caixinha excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir caixinha:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir caixinha' },
      { status: 500 }
    )
  }
}
