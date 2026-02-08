import { createCookie } from '@remix-run/node'
import { randomUUID } from 'crypto'

const sessionCookie = createCookie('shoppinglist_session', {
  secrets: [process.env.SESSION_SECRET || 'fallback-secret-change-in-production'],
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  httpOnly: true,
  path: '/',
})

export async function verifyPassword(password: string): Promise<boolean> {
  const expectedPassword = process.env.APP_PASSWORD
  if (!expectedPassword) {
    throw new Error('APP_PASSWORD environment variable is required')
  }
  return password === expectedPassword
}

export async function createSession() {
  const sessionId = randomUUID()
  return await sessionCookie.serialize(sessionId)
}

export async function verifySession(cookieHeader: string | null): Promise<boolean> {
  if (!cookieHeader) return false
  try {
    const sessionId = await sessionCookie.parse(cookieHeader)
    return !!sessionId
  } catch {
    return false
  }
}

export { sessionCookie }
