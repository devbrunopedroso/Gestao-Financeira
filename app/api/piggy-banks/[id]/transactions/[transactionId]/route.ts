import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEdit } from '@/lib/permissions'

/**
 * DELETE /api/piggy-banks/[id]/transactions/[transactionId]
 * Exclui uma transação e recalcula o valor atual da caixinha
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; transactionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    // Buscar transação
    const transaction = await prisma.piggyBankTransaction.findUnique({
      where: { id: params.transactionId },
      include: { piggyBank: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { message: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    if (transaction.piggyBankId !== params.id) {
      return NextResponse.json(
        { message: 'Transação não pertence a esta caixinha' },
        { status: 400 }
      )
    }

    // Verificar permissões
    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: transaction.piggyBank.accountId,
        },
      },
    })

    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json(
        { message: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    // Reverter o valor da transação
    const transactionAmount = Number(transaction.amount)
    const currentAmount = Number(transaction.piggyBank.currentAmount)
    let newCurrentAmount = currentAmount

    if (transaction.type === 'DEPOSIT') {
      newCurrentAmount = Math.max(0, currentAmount - transactionAmount)
    } else if (transaction.type === 'WITHDRAWAL') {
      newCurrentAmount = currentAmount + transactionAmount
    }

    // Excluir transação e atualizar caixinha
    await prisma.$transaction([
      prisma.piggyBankTransaction.delete({
        where: { id: params.transactionId },
      }),
      prisma.piggyBank.update({
        where: { id: params.id },
        data: {
          currentAmount: newCurrentAmount,
        },
      }),
    ])

    return NextResponse.json({ message: 'Transação excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir transação:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir transação' },
      { status: 500 }
    )
  }
}




