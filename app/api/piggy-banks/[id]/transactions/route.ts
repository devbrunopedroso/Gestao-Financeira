import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { piggyBankTransactionSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'
import { calculateMonthlyAmount, monthsBetween } from '@/lib/helpers'

/**
 * POST /api/piggy-banks/[id]/transactions
 * Cria uma transação (aporte ou retirada) em uma caixinha
 * US-24: Fazer aporte na caixinha
 * US-25: Retirar dinheiro da caixinha
 * US-26: Recalcular valor mensal automaticamente (faz parte do retorno)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await piggyBankTransactionSchema.validate(body)

    // Buscar caixinha para verificar permissões
    const piggyBank = await prisma.piggyBank.findUnique({
      where: { id: params.id },
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

    // Calcular novo valor atual
    const transactionAmount = Number(validatedData.amount)
    const currentAmount = Number(piggyBank.currentAmount)
    let newCurrentAmount = currentAmount

    if (validatedData.type === 'DEPOSIT') {
      newCurrentAmount = currentAmount + transactionAmount
    } else if (validatedData.type === 'WITHDRAWAL') {
      newCurrentAmount = Math.max(0, currentAmount - transactionAmount)
    }

    // Criar transação e atualizar caixinha em uma transação
    const [transaction, updatedPiggyBank] = await prisma.$transaction([
      prisma.piggyBankTransaction.create({
        data: {
          piggyBankId: params.id,
          amount: validatedData.amount,
          type: validatedData.type,
          description: validatedData.description || null,
          date: new Date(validatedData.date),
        },
      }),
      prisma.piggyBank.update({
        where: { id: params.id },
        data: {
          currentAmount: newCurrentAmount,
        },
      }),
    ])

    // Recalcular valor mensal sugerido
    const now = new Date()
    const startDate = new Date(updatedPiggyBank.startDate)
    let monthsRemaining = 0

    if (updatedPiggyBank.endDate) {
      monthsRemaining = monthsBetween(now, new Date(updatedPiggyBank.endDate))
    } else if (updatedPiggyBank.months) {
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + updatedPiggyBank.months)
      monthsRemaining = monthsBetween(now, endDate)
    }

    const suggestedMonthlyAmount = calculateMonthlyAmount(
      Number(updatedPiggyBank.targetAmount),
      newCurrentAmount,
      monthsRemaining
    )

    const progress = Math.min(
      Math.round((newCurrentAmount / Number(updatedPiggyBank.targetAmount)) * 100),
      100
    )

    return NextResponse.json(
      {
        transaction: {
          ...transaction,
          amount: Number(transaction.amount),
        },
        piggyBank: {
          ...updatedPiggyBank,
          targetAmount: Number(updatedPiggyBank.targetAmount),
          currentAmount: newCurrentAmount,
          suggestedMonthlyAmount,
          monthsRemaining,
          progress,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro ao criar transação:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar transação' },
      { status: 500 }
    )
  }
}




