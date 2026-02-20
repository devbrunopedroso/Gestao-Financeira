import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'System2026@_financas'
const COOKIE_NAME = 'admin-token'
const TOKEN_EXPIRY = '24h'

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')
  return new TextEncoder().encode(secret)
}

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret())
}

export async function verifyAdminToken(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return false
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export { COOKIE_NAME }
