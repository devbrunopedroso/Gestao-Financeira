import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/piggy-banks/share/accept
 * Aceita um compartilhamento de caixinha
 * US-34: Compartilhar apenas uma caixinha (aceitação)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { message: 'Token é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar compartilhamento válido
    const share = await prisma.piggyBankShare.findUnique({
      where: { token },
      include: { piggyBank: true },
    })

    if (!share) {
      return NextResponse.json(
        { message: 'Compartilhamento não encontrado' },
        { status: 404 }
      )
    }

    if (share.accepted) {
      return NextResponse.json(
        { message: 'Este compartilhamento já foi aceito' },
        { status: 400 }
      )
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Este compartilhamento expirou' },
        { status: 400 }
      )
    }

    // Verificar se o email corresponde ao usuário logado
    if (share.email !== session.user.email) {
      return NextResponse.json(
        { message: 'Este compartilhamento não é para sua conta' },
        { status: 403 }
      )
    }

    // Verificar se o usuário já tem acesso à conta (para ter acesso à caixinha)
    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: share.piggyBank.accountId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        {
          message:
            'Você precisa ter acesso à conta financeira primeiro para acessar a caixinha',
        },
        { status: 403 }
      )
    }

    // Marcar como aceito
    await prisma.piggyBankShare.update({
      where: { id: share.id },
      data: { accepted: true },
    })

    return NextResponse.json({
      message: 'Compartilhamento aceito com sucesso',
      piggyBankId: share.piggyBankId,
    })
  } catch (error) {
    console.error('Erro ao aceitar compartilhamento:', error)
    return NextResponse.json(
      { message: 'Erro ao aceitar compartilhamento' },
      { status: 500 }
    )
  }
}




