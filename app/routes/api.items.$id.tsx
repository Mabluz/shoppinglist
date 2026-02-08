import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { items, type Item } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { eq } from 'drizzle-orm'

export const loader: LoaderFunction = async ({ request, params }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  throw new Response('Not implemented', { status: 405 })
}

export const action: ActionFunction = async ({ request, params }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  const id = params.id
  if (!id) throw new Response('Item ID required', { status: 404 })

  const existingItem = await db.select().from(items).where(eq(items.id, id)).limit(1)
  if (!existingItem.length) throw new Response('Item not found', { status: 404 })

  switch (request.method) {
    case 'PATCH': {
      const body = await request.json()

      const updated: Partial<Item> = {
        updatedAt: new Date(),
      }

      if (body.content !== undefined) {
        updated.content = body.content.trim()
      }

      if (body.isCompleted !== undefined) {
        updated.isCompleted = body.isCompleted
      }

      if (body.completedAt !== undefined) {
        updated.completedAt = body.completedAt ? new Date(body.completedAt) : null
      }

      if (body.store !== undefined) {
        updated.store = body.store?.trim() || null
      }

      await db.update(items).set(updated).where(eq(items.id, id))
      const result = await db.select().from(items).where(eq(items.id, id)).limit(1)
      return json(result[0])
    }

    case 'DELETE': {
      await db.delete(items).where(eq(items.id, id))
      return json({ success: true })
    }

    default:
      throw new Response('Method not allowed', { status: 405 })
  }
}

export default function ItemDetail() {
  // This route is only for API calls, not directly rendered
  return null
}
