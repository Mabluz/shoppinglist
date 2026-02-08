import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { items, stores } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { eq, and, sql } from 'drizzle-orm'

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

      const updated: any = {
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

      if (body.storeId !== undefined) {
        updated.storeId = body.storeId || null
      }

      if (body.quantity !== undefined) {
        updated.quantity = Math.max(1, body.quantity)
      }

      await db.update(items).set(updated).where(eq(items.id, id))

      const result = await db
        .select({
          id: items.id,
          content: items.content,
          storeId: items.storeId,
          storeName: stores.name,
          isCompleted: items.isCompleted,
          completedAt: items.completedAt,
          createdAt: items.createdAt,
          updatedAt: items.updatedAt,
        })
        .from(items)
        .leftJoin(stores, eq(items.storeId, stores.id))
        .where(eq(items.id, id))
        .limit(1)

      return json(result[0])
    }

    case 'DELETE': {
      // Get the item's content
      const item = existingItem[0]

      // Count how many non-deleted items exist with the same content
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(items)
        .where(and(
          eq(items.content, item.content),
          eq(items.isDeleted, false)
        ))

      const count = Number(countResult[0]?.count || 0)

      // If this is the only item with this content, soft delete it
      if (count <= 1) {
        await db.update(items)
          .set({
            isDeleted: true,
            isCompleted: true,
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(items.id, id))
        return json({ success: true, softDeleted: true })
      }

      // Otherwise, hard delete it
      await db.delete(items).where(eq(items.id, id))
      return json({ success: true, softDeleted: false })
    }

    default:
      throw new Response('Method not allowed', { status: 405 })
  }
}

export default function ItemDetail() {
  // This route is only for API calls, not directly rendered
  return null
}
