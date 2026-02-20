import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fixedExpenseSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * GET /api/expenses/fixed
 * Lista despesas fixas de uma conta
 * US-13: Visualizar impacto das despesas fixas
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

    // Verificar acesso
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

    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: { accountId },
      include: {
        category: true,
        payments: { where: { month, year } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(fixedExpenses)
  } catch (error) {
    console.error('Erro ao buscar despesas fixas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar despesas fixas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expenses/fixed
 * Cria uma nova despesa fixa
 * US-10: Cadastrar despesa fixa mensal (sem prazo)
 * US-11: Cadastrar despesa fixa temporária (com prazo)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await fixedExpenseSchema.validate(body)

    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { message: 'accountId é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar permissões
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

    const fixedExpense = await prisma.fixedExpense.create({
      data: {
        accountId,
        amount: validatedData.amount,
        description: validatedData.description,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        categoryId: validatedData.categoryId || null,
        dueDay: validatedData.dueDay || null,
      },
      include: { category: true },
    })

    return NextResponse.json(fixedExpense, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar despesa fixa:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar despesa fixa' },
      { status: 500 }
    )
  }
}




