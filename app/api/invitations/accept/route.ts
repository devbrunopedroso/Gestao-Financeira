import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/invitations/accept
 * Aceita um convite para acessar uma conta
 * US-03: Acessar conta existente (via convite)
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

    // Buscar convite válido
    const invitation = await prisma.accountInvitation.findUnique({
      where: { token },
      include: { account: true },
    })

    if (!invitation) {
      return NextResponse.json(
        { message: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    if (invitation.accepted) {
      return NextResponse.json(
        { message: 'Este convite já foi aceito' },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Este convite expirou' },
        { status: 400 }
      )
    }

    // Verificar se o email do convite corresponde ao usuário logado
    if (invitation.email !== session.user.email) {
      return NextResponse.json(
        { message: 'Este convite não é para sua conta' },
        { status: 403 }
      )
    }

    // Criar membro da conta
    await prisma.$transaction([
      prisma.accountMember.create({
        data: {
          userId: session.user.id,
          accountId: invitation.accountId,
          role: invitation.role,
        },
      }),
      prisma.accountInvitation.update({
        where: { id: invitation.id },
        data: { accepted: true },
      }),
    ])

    return NextResponse.json({
      message: 'Convite aceito com sucesso',
      accountId: invitation.accountId,
    })
  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error)

    // Se o erro for de constraint única, o usuário já é membro
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: 'Você já é membro desta conta' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao aceitar convite' },
      { status: 500 }
    )
  }
}




