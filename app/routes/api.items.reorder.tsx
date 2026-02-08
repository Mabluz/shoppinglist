import type { ActionFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { items } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { eq } from 'drizzle-orm'

export const action: ActionFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  if (request.method === 'POST') {
    const body = await request.json()
    const { itemOrders } = body as { itemOrders: Array<{ id: string; order: number }> }

    if (!Array.isArray(itemOrders)) {
      throw new Response('itemOrders must be an array', { status: 400 })
    }

    // Update all items with their new order
    for (const { id, order } of itemOrders) {
      await db
        .update(items)
        .set({ order, updatedAt: new Date() })
        .where(eq(items.id, id))
    }

    return json({ success: true })
  }

  throw new Response('Method not allowed', { status: 405 })
}

export default function ReorderAPI() {
  return null
}
