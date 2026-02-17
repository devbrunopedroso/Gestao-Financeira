import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { categorySchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'
import { DEFAULT_CATEGORIES } from '@/lib/constants'

/**
 * GET /api/categories
 * Lista categorias de uma conta (incluindo padrões)
 * US-18: Usar categorias padrão
 * US-19: Criar categorias personalizadas
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

    // Buscar categorias personalizadas da conta
    const customCategories = await prisma.category.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
    })

    // Retornar categorias padrão (sempre disponíveis) + personalizadas
    // As categorias padrão são apenas referência, não são salvas no banco
    // O frontend pode usá-las diretamente ou salvar como personalizadas quando usadas
    const defaultCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
      id: `default-${index}`,
      name: cat.name,
      description: null,
      isDefault: true,
      color: cat.color,
      icon: cat.icon,
      accountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    return NextResponse.json({
      default: defaultCategories,
      custom: customCategories,
    })
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar categorias' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 * Cria uma nova categoria personalizada
 * US-19: Criar categorias personalizadas
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await categorySchema.validate(body)

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

    // Verificar se já existe categoria com mesmo nome na conta
    const existing = await prisma.category.findFirst({
      where: {
        accountId,
        name: validatedData.name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { message: 'Já existe uma categoria com esse nome' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        accountId,
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color || null,
        icon: validatedData.icon || null,
        isDefault: false,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar categoria:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}




