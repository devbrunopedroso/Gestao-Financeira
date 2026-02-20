import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assetSchema } from '@/lib/validations'
import { canEdit } from '@/lib/permissions'

/**
 * GET /api/assets
 * Lista patrimônios de uma conta
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

    const assets = await prisma.asset.findMany({
      where: { accountId },
      include: {
        piggyBank: {
          include: {
            transactions: {
              orderBy: { date: 'desc' },
              take: 5,
            },
            skippedMonths: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const assetsWithNumbers = assets.map((asset) => ({
      ...asset,
      estimatedValue: Number(asset.estimatedValue),
      yieldRate: asset.yieldRate ? Number(asset.yieldRate) : null,
      piggyBank: asset.piggyBank
        ? {
            ...asset.piggyBank,
            targetAmount: Number(asset.piggyBank.targetAmount),
            currentAmount: Number(asset.piggyBank.currentAmount),
            monthlyContribution: asset.piggyBank.monthlyContribution
              ? Number(asset.piggyBank.monthlyContribution)
              : null,
            progress: Math.min(
              Math.round(
                (Number(asset.piggyBank.currentAmount) /
                  Number(asset.piggyBank.targetAmount)) *
                  100
              ),
              100
            ),
          }
        : null,
    }))

    return NextResponse.json(assetsWithNumbers)
  } catch (error) {
    console.error('Erro ao buscar patrimônios:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar patrimônios' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/assets
 * Cria um novo patrimônio
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = await assetSchema.validate(body)

    const { accountId } = validatedData

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

    // Se em andamento, criar caixinha vinculada para tracking
    if (validatedData.status === 'EM_ANDAMENTO') {
      const piggyBank = await prisma.piggyBank.create({
        data: {
          accountId,
          name: `Patrimônio: ${validatedData.name}`,
          description: validatedData.description || null,
          targetAmount: validatedData.estimatedValue,
          startDate: new Date(),
          monthlyContribution: validatedData.monthlyPayment || null,
        },
      })

      const asset = await prisma.asset.create({
        data: {
          accountId,
          name: validatedData.name,
          description: validatedData.description || null,
          estimatedValue: validatedData.estimatedValue,
          status: validatedData.status as any,
          category: validatedData.category as any,
          yieldRate: validatedData.yieldRate || null,
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
          piggyBankId: piggyBank.id,
        },
        include: { piggyBank: true },
      })

      return NextResponse.json(
        {
          ...asset,
          estimatedValue: Number(asset.estimatedValue),
          yieldRate: asset.yieldRate ? Number(asset.yieldRate) : null,
          piggyBank: {
            ...piggyBank,
            targetAmount: Number(piggyBank.targetAmount),
            currentAmount: Number(piggyBank.currentAmount),
            monthlyContribution: piggyBank.monthlyContribution
              ? Number(piggyBank.monthlyContribution)
              : null,
            progress: 0,
          },
        },
        { status: 201 }
      )
    }

    // Patrimônio quitado - sem caixinha
    const asset = await prisma.asset.create({
      data: {
        accountId,
        name: validatedData.name,
        description: validatedData.description || null,
        estimatedValue: validatedData.estimatedValue,
        status: validatedData.status as any,
        category: validatedData.category as any,
        yieldRate: validatedData.yieldRate || null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      },
    })

    return NextResponse.json(
      {
        ...asset,
        estimatedValue: Number(asset.estimatedValue),
        yieldRate: asset.yieldRate ? Number(asset.yieldRate) : null,
        piggyBank: null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro ao criar patrimônio:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro ao criar patrimônio' },
      { status: 500 }
    )
  }
}
