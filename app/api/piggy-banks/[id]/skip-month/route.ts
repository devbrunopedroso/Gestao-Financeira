import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEdit } from '@/lib/permissions'

/**
 * POST /api/piggy-banks/[id]/skip-month
 * Pula a contribuicao de um mes especifico
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 })
    }

    const { month, year } = await request.json()
    if (!month || !year) {
      return NextResponse.json({ message: 'month e year sao obrigatorios' }, { status: 400 })
    }

    const piggyBank = await prisma.piggyBank.findUnique({ where: { id: params.id } })
    if (!piggyBank) {
      return NextResponse.json({ message: 'Caixinha nao encontrada' }, { status: 404 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId: piggyBank.accountId } },
    })
    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json({ message: 'Sem permissao' }, { status: 403 })
    }

    await prisma.piggyBankSkippedMonth.upsert({
      where: { piggyBankId_month_year: { piggyBankId: params.id, month, year } },
      create: { piggyBankId: params.id, month, year },
      update: {},
    })

    return NextResponse.json({ skipped: true, month, year })
  } catch (error) {
    console.error('Erro ao pular mes:', error)
    return NextResponse.json({ message: 'Erro ao pular mes' }, { status: 500 })
  }
}

/**
 * DELETE /api/piggy-banks/[id]/skip-month
 * Reativa a contribuicao de um mes especifico
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 })
    }

    const { month, year } = await request.json()
    if (!month || !year) {
      return NextResponse.json({ message: 'month e year sao obrigatorios' }, { status: 400 })
    }

    const piggyBank = await prisma.piggyBank.findUnique({ where: { id: params.id } })
    if (!piggyBank) {
      return NextResponse.json({ message: 'Caixinha nao encontrada' }, { status: 404 })
    }

    const membership = await prisma.accountMember.findUnique({
      where: { userId_accountId: { userId: session.user.id, accountId: piggyBank.accountId } },
    })
    if (!membership || !canEdit(membership.role)) {
      return NextResponse.json({ message: 'Sem permissao' }, { status: 403 })
    }

    await prisma.piggyBankSkippedMonth.deleteMany({
      where: { piggyBankId: params.id, month, year },
    })

    return NextResponse.json({ skipped: false, month, year })
  } catch (error) {
    console.error('Erro ao reativar mes:', error)
    return NextResponse.json({ message: 'Erro ao reativar mes' }, { status: 500 })
  }
}
