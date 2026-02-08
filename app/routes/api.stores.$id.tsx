import type { ActionFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { stores, items, type Store } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { eq, sql } from 'drizzle-orm'

export const action: ActionFunction = async ({ request, params }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  const id = params.id
  if (!id) throw new Response('Store ID required', { status: 404 })

  const existingStore = await db.select().from(stores).where(eq(stores.id, id)).limit(1)
  if (!existingStore.length) throw new Response('Store not found', { status: 404 })

  switch (request.method) {
    case 'PATCH': {
      const body = await request.json()

      const updated: Partial<Store> = {
        updatedAt: new Date(),
      }

      if (body.name !== undefined) {
        const newName = body.name.trim()
        if (!newName) {
          throw new Response('Store name cannot be empty', { status: 400 })
        }

        // Check if new name already exists (excluding current store)
        const existing = await db
          .select()
          .from(stores)
          .where(eq(stores.name, newName))
          .limit(1)

        if (existing.length > 0 && existing[0].id !== id) {
          throw new Response('Store name already exists', { status: 409 })
        }

        updated.name = newName
      }

      await db.update(stores).set(updated).where(eq(stores.id, id))
      const result = await db.select().from(stores).where(eq(stores.id, id)).limit(1)
      return json(result[0])
    }

    case 'DELETE': {
      // Check if store has any items
      const itemsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(items)
        .where(eq(items.storeId, id))

      if (itemsCount[0].count > 0) {
        throw new Response(
          `Cannot delete store with ${itemsCount[0].count} items. Please move or delete items first.`,
          { status: 409 }
        )
      }

      await db.delete(stores).where(eq(stores.id, id))
      return json({ success: true })
    }

    default:
      throw new Response('Method not allowed', { status: 405 })
  }
}

export default function StoreDetail() {
  return null
}
