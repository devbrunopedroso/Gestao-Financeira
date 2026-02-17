import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { financialAccountSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validar dados com Yup
    const validatedData = await financialAccountSchema.validate(body)

    // Criar conta financeira
    const account = await prisma.financialAccount.create({
      data: {
        name: validatedData.name,
        creatorId: session.user.id,
      },
    })

    // Criar membro admin automaticamente
    await prisma.accountMember.create({
      data: {
        userId: session.user.id,
        accountId: account.id,
        role: 'ADMIN',
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar conta:', error)
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar conta' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    // Buscar contas onde o usuário é membro
    const memberships = await prisma.accountMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        account: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    const accounts = memberships.map((membership) => ({
      ...membership.account,
      myRole: membership.role,
    }))

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Erro ao buscar contas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar contas' },
      { status: 500 }
    )
  }
}

