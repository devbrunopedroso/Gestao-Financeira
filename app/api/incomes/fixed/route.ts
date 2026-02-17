import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fixedIncomeSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * GET /api/incomes/fixed
 * Lista todas as rendas fixas de uma conta
 * US-09: Visualizar renda mensal (inclui rendas fixas)
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

    // Verificar se o usuário tem acesso à conta
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

    const fixedIncomes = await prisma.fixedIncome.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(fixedIncomes)
  } catch (error) {
    console.error('Erro ao buscar rendas fixas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar rendas fixas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/incomes/fixed
 * Cria uma nova renda fixa
 * US-06: Cadastrar renda fixa mensal
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await fixedIncomeSchema.validate(body)

    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { message: 'accountId é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem permissão de edição
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

    const fixedIncome = await prisma.fixedIncome.create({
      data: {
        accountId,
        amount: validatedData.amount,
        description: validatedData.description || null,
      },
    })

    return NextResponse.json(fixedIncome, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar renda fixa:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar renda fixa' },
      { status: 500 }
    )
  }
}




