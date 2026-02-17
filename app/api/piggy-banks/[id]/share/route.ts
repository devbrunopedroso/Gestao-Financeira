import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invitationSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'
import crypto from 'crypto'

/**
 * GET /api/piggy-banks/[id]/share
 * Lista compartilhamentos de uma caixinha
 * US-34: Compartilhar apenas uma caixinha
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
    })

    if (!piggyBank) {
      return NextResponse.json(
        { message: 'Caixinha não encontrada' },
        { status: 404 }
      )
    }

    // Verificar acesso à conta
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

    const shares = await prisma.piggyBankShare.findMany({
      where: { piggyBankId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(shares)
  } catch (error) {
    console.error('Erro ao buscar compartilhamentos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar compartilhamentos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/piggy-banks/[id]/share
 * Compartilha uma caixinha com um email
 * US-34: Compartilhar apenas uma caixinha
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

    const piggyBank = await prisma.piggyBank.findUnique({
      where: { id },
    })

    if (!piggyBank) {
      return NextResponse.json(
        { message: 'Caixinha não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissões na conta
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
        { message: 'Sem permissão para compartilhar' },
        { status: 403 }
      )
    }

    // Verificar se já existe compartilhamento pendente
    const existingShare = await prisma.piggyBankShare.findFirst({
      where: {
        piggyBankId: id,
        email: validatedData.email,
        accepted: false,
      },
    })

    if (existingShare) {
      return NextResponse.json(
        { message: 'Já existe um compartilhamento pendente para este email' },
        { status: 400 }
      )
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expira em 7 dias

    const share = await prisma.piggyBankShare.create({
      data: {
        piggyBankId: id,
        email: validatedData.email,
        role: validatedData.role,
        token,
        expiresAt,
      },
    })

    // Em produção, enviaria email aqui
    return NextResponse.json(
      {
        ...share,
        shareUrl: `${process.env.NEXTAUTH_URL}/piggy-banks/share/accept?token=${token}`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro ao compartilhar caixinha:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao compartilhar caixinha' },
      { status: 500 }
    )
  }
}
