import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { stores, items, type Store } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { desc, eq, sql } from 'drizzle-orm'

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  const allStores = await db.select().from(stores).orderBy(stores.name)
  return json(allStores)
}

export const action: ActionFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  if (request.method === 'POST') {
    const body = await request.json()
    const newStore: Store = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (!newStore.name) {
      throw new Response('Store name is required', { status: 400 })
    }

    // Check if store name already exists
    const existing = await db.select().from(stores).where(eq(stores.name, newStore.name)).limit(1)
    if (existing.length > 0) {
      throw new Response('Store name already exists', { status: 409 })
    }

    await db.insert(stores).values(newStore)

    return json(newStore, { status: 201 })
  }

  throw new Response('Method not allowed', { status: 405 })
}

export default function StoresAPI() {
  return null
}
