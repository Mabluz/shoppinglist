import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json, BadRequest, NotFound } from '@remix-run/node'
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
  if (!id) throw new NotFound('Item ID required')

  const existingItem = await db.select().from(items).where(eq(items.id, id)).limit(1)
  if (!existingItem.length) throw new NotFound('Item not found')

  switch (request.method) {
    case 'PATCH': {
      const formData = await request.formData()
      const content = formData.get('content') as string | null
      const isCompleted = formData.get('isCompleted') as string | null
      const completedAt = formData.get('completedAt') as string | null

      const updated: Partial<Item> = {
        updatedAt: new Date().toISOString(),
      }

      if (content !== null) {
        updated.content = content.trim()
      }

      if (isCompleted !== null) {
        updated.isCompleted = isCompleted === 'true'
      }

      if (completedAt !== null) {
        updated.completedAt = completedAt || null
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
