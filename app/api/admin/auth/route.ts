import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPassword, createAdminToken, COOKIE_NAME } from '@/lib/admin'

/**
 * POST /api/admin/auth
 * Autentica com senha admin e seta cookie
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ message: 'Senha incorreta' }, { status: 401 })
    }

    const token = await createAdminToken()

    const response = NextResponse.json({ message: 'Autenticado' })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24h
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ message: 'Erro ao autenticar' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/auth
 * Logout admin — remove cookie
 */
export async function DELETE() {
  const response = NextResponse.json({ message: 'Desconectado' })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
