import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/users/[id]
 * Bloquear/desbloquear usuario
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminToken()
    if (!isAdmin) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ message: 'Usuario nao encontrado' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { blocked: body.blocked },
    })

    return NextResponse.json({
      id: updated.id,
      blocked: updated.blocked,
      message: updated.blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado',
    })
  } catch (error) {
    console.error('Erro ao atualizar usuario:', error)
    return NextResponse.json({ message: 'Erro ao atualizar usuario' }, { status: 500 })
  }
}
