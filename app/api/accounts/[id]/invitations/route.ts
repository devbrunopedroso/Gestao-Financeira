import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invitationSchema } from '@/lib/validations'
import { isAdmin } from '@/lib/permissions'
import crypto from 'crypto'

/**
 * GET /api/accounts/[id]/invitations
 * Lista convites pendentes de uma conta
 * US-04: Convidar usuários
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

    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: id,
        },
      },
    })

    if (!membership || !isAdmin(membership.role)) {
      return NextResponse.json(
        { message: 'Apenas administradores podem ver convites' },
        { status: 403 }
      )
    }

    const invitations = await prisma.accountInvitation.findMany({
      where: {
        accountId: id,
        accepted: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Erro ao buscar convites:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar convites' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/accounts/[id]/invitations
 * Cria um novo convite para a conta
 * US-04: Convidar usuários
 * US-05: Definir permissões (via role)
 */
export async function POST(
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
    const validatedData = await invitationSchema.validate(body)

    // Verificar se o usuário é admin da conta
    const membership = await prisma.accountMember.findUnique({
      where: {
        userId_accountId: {
          userId: session.user.id,
          accountId: id,
        },
      },
    })

    if (!membership || !isAdmin(membership.role)) {
      return NextResponse.json(
        { message: 'Apenas administradores podem convidar usuários' },
        { status: 403 }
      )
    }

    // Verificar se o email já é membro
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: {
        accountMemberships: {
          where: { accountId: id },
        },
      },
    })

    if (user && user.accountMemberships.length > 0) {
      return NextResponse.json(
        { message: 'Este usuário já é membro da conta' },
        { status: 400 }
      )
    }

    // Verificar se já existe convite pendente
    const existingInvitation = await prisma.accountInvitation.findFirst({
      where: {
        accountId: id,
        email: validatedData.email,
        accepted: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { message: 'Já existe um convite pendente para este email' },
        { status: 400 }
      )
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expira em 7 dias

    const invitation = await prisma.accountInvitation.create({
      data: {
        accountId: id,
        email: validatedData.email,
        role: validatedData.role,
        token,
        expiresAt,
      },
    })

    // Em produção, aqui enviaria um email com o link de aceitação
    // Por enquanto, retornamos o token para fins de desenvolvimento

    return NextResponse.json(
      {
        ...invitation,
        invitationUrl: `${process.env.NEXTAUTH_URL}/invitations/accept?token=${token}`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro ao criar convite:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar convite' },
      { status: 500 }
    )
  }
}
