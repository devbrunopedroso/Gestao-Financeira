import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extraIncomeSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * GET /api/incomes/extra
 * Lista rendas extras filtradas por conta e mês/ano
 * US-09: Visualizar renda mensal (inclui rendas extras do mês)
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
    if (month && year) {
      where.month = parseInt(month)
      where.year = parseInt(year)
    }

    const extraIncomes = await prisma.extraIncome.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(extraIncomes)
  } catch (error) {
    console.error('Erro ao buscar rendas extras:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar rendas extras' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/incomes/extra
 * Cria uma nova renda extra
 * US-08: Cadastrar renda extra por mês
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await extraIncomeSchema.validate(body)

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

    const extraIncome = await prisma.extraIncome.create({
      data: {
        accountId,
        amount: validatedData.amount,
        description: validatedData.description || null,
        month: validatedData.month,
        year: validatedData.year,
      },
    })

    return NextResponse.json(extraIncome, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar renda extra:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar renda extra' },
      { status: 500 }
    )
  }
}




