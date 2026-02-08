import type { MetaFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, Form, Link, redirect } from '@remix-run/react'
import ShoppingList from '~/components/ShoppingList'
import { verifySession } from '~/server/auth'
import { db } from '~/server/db'
import { items, stores } from '~/server/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export const meta: MetaFunction = () => {
  return [
    { title: 'Handleliste' },
    { name: 'description', content: 'Enkel handleliste for telefonen' },
    { viewport: 'width=device-width, initial-scale=1' },
  ]
}

export const loader: LoaderFunction = async ({ request }) => {
  // Check authentication
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) {
    return redirect('/login')
  }

  // Fetch all items with store information
  const allItems = await db
    .select({
      id: items.id,
      content: items.content,
      storeId: items.storeId,
      storeName: stores.name,
      isCompleted: items.isCompleted,
      completedAt: items.completedAt,
      order: items.order,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .leftJoin(stores, eq(items.storeId, stores.id))
    .orderBy(items.order)

  // Fetch all stores
  const allStores = await db.select().from(stores).orderBy(stores.name)

  return json({ items: allItems, stores: allStores })
}

export default function Index() {
  const { items, stores } = useLoaderData<typeof loader>()

  return <ShoppingList initialItems={items} stores={stores} />
}
