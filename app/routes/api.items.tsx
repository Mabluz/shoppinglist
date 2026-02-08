import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { items, stores } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { desc, eq } from 'drizzle-orm'

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  const allItems = await db
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
    .orderBy(desc(items.createdAt))

  return json(allItems)
}

export const action: ActionFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  if (request.method === 'POST') {
    const body = await request.json()
    const newItem = {
      id: body.id || crypto.randomUUID(),
      content: body.content.trim(),
      storeId: body.storeId || null,
      isCompleted: body.isCompleted || false,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
    }

    if (!newItem.content) {
      throw new Response('Content is required', { status: 400 })
    }

    await db.insert(items).values(newItem)

    return json(newItem, { status: 201 })
  }

  throw new Response('Method not allowed', { status: 405 })
}

export default function ItemsAPI() {
  // This route is only for API calls, not directly rendered
  return null
}
