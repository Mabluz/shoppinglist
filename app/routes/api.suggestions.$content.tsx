import type { ActionFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { items } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { eq } from 'drizzle-orm'

export const action: ActionFunction = async ({ request, params }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  const content = params.content
  if (!content) throw new Response('Content required', { status: 400 })

  // Decode the URL-encoded content
  const decodedContent = decodeURIComponent(content)

  if (request.method === 'DELETE') {
    // Permanently delete all items (including soft-deleted) with this content
    await db.delete(items).where(eq(items.content, decodedContent))
    return json({ success: true })
  }

  throw new Response('Method not allowed', { status: 405 })
}

export default function SuggestionDelete() {
  // This route is only for API calls, not directly rendered
  return null
}
