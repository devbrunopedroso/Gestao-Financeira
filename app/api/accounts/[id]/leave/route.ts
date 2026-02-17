import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/accounts/[id]/leave
 * Remove o usuario logado da conta
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 })
    }

    const { id: accountId } = await params

    const account = await prisma.financialAccount.findUnique({
      where: { id: accountId },
      select: { creatorId: true },
    })

    if (!account) {
      return NextResponse.json({ message: 'Conta nao encontrada' }, { status: 404 })
    }

    if (account.creatorId === session.user.id) {
      return NextResponse.json(
        { message: 'O criador da conta nao pode sair. Exclua a conta se desejar.' },
        { status: 400 }
      )
    }

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
        { message: 'Voce nao e membro desta conta' },
        { status: 400 }
      )
    }

    await prisma.accountMember.delete({
      where: { id: membership.id },
    })

    return NextResponse.json({ message: 'Voce saiu da conta com sucesso' })
  } catch (error) {
    console.error('Erro ao sair da conta:', error)
    return NextResponse.json(
      { message: 'Erro ao sair da conta' },
      { status: 500 }
    )
  }
}
