import type { MetaFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, Form, Link, redirect } from '@remix-run/react'
import ShoppingList from '~/components/ShoppingList'
import { verifySession } from '~/server/auth'
import { db } from '~/server/db'
import { items } from '~/server/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export const meta: MetaFunction = () => {
  return [
    { title: 'Shopping List' },
    { name: 'description', content: 'Simple shopping list for your phone' },
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

  // Fetch all items (localStorage will sync later, but load initial state)
  const allItems = await db.select().from(items).orderBy(desc(items.createdAt))

  // Extract unique stores
  const stores = Array.from(new Set(
    allItems
      .map(item => item.store)
      .filter((store): store is string => !!store)
  ))

  return json({ items: allItems, stores })
}

export default function Index() {
  const { items, stores } = useLoaderData<typeof loader>()

  return <ShoppingList initialItems={items} stores={stores} />
}
