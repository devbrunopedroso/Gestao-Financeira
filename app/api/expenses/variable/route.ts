import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { variableExpenseSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * GET /api/expenses/variable
 * Lista despesas variáveis filtradas por conta e mês/ano
 * US-14: Lançar despesa variável (visualização para editar/excluir)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

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

    // Construir filtros
    const where: any = { accountId }

    if (startDateParam && endDateParam) {
      where.date = {
        gte: new Date(startDateParam + 'T00:00:00'),
        lte: new Date(endDateParam + 'T23:59:59.999'),
      }
    } else if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const startDate = new Date(yearNum, monthNum - 1, 1)
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)

      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    const variableExpenses = await prisma.variableExpense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(variableExpenses)
  } catch (error) {
    console.error('Erro ao buscar despesas variáveis:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar despesas variáveis' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expenses/variable
 * Cria uma nova despesa variável
 * US-14: Lançar despesa variável rapidamente
 * US-15: Lançar várias despesas em sequência (mesma API, chamadas múltiplas)
 * US-16: Categorizar despesas (via categoryId)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await variableExpenseSchema.validate(body)

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

    const variableExpense = await prisma.variableExpense.create({
      data: {
        accountId,
        amount: validatedData.amount,
        description: validatedData.description || null,
        date: new Date(validatedData.date),
        categoryId: validatedData.categoryId || null,
      },
      include: { category: true },
    })

    return NextResponse.json(variableExpense, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar despesa variável:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar despesa variável' },
      { status: 500 }
    )
  }
}




