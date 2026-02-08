import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import crypto from 'crypto'
import { db } from '~/server/db'
import { items, stores } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { desc, eq, or, isNull, and } from 'drizzle-orm'

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
      order: items.order,
      quantity: items.quantity,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .leftJoin(stores, eq(items.storeId, stores.id))
    .where(or(eq(items.isDeleted, false), isNull(items.isDeleted)))
    .orderBy(items.order)

  return json(allItems)
}

export const action: ActionFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  if (request.method === 'POST') {
    const body = await request.json()

    if (!body.content?.trim()) {
      throw new Response('Content is required', { status: 400 })
    }

    const content = body.content.trim()
    const storeId = body.storeId || null

    // Check if an item with the same content and storeId already exists (not deleted, not completed)
    const existingItem = await db
      .select()
      .from(items)
      .where(and(
        eq(items.content, content),
        storeId ? eq(items.storeId, storeId) : isNull(items.storeId),
        eq(items.isDeleted, false),
        eq(items.isCompleted, false)
      ))
      .limit(1)

    // If item exists, increment its quantity instead of creating a new one
    if (existingItem.length > 0) {
      const item = existingItem[0]
      const newQuantity = item.quantity + (body.quantity || 1)

      await db
        .update(items)
        .set({
          quantity: newQuantity,
          updatedAt: new Date()
        })
        .where(eq(items.id, item.id))

      return json({ ...item, quantity: newQuantity, updatedAt: new Date() }, { status: 200 })
    }

    // Otherwise, create a new item
    const newItem = {
      id: body.id || crypto.randomUUID(),
      content: content,
      storeId: storeId,
      isCompleted: body.isCompleted || false,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      order: body.order ?? 0,
      quantity: body.quantity || 1,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
    }

    // Increment order of all existing items to make room for new item at position 0
    await db.execute(`
      UPDATE items SET "order" = "order" + 1
    `)

    await db.insert(items).values(newItem)

    return json(newItem, { status: 201 })
  }

  throw new Response('Method not allowed', { status: 405 })
}

export default function ItemsAPI() {
  // This route is only for API calls, not directly rendered
  return null
}
