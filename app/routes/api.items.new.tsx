import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, useActionData, Form } from '@remix-run/react'
import { db } from '~/server/db'
import { items, type Item } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { eq } from 'drizzle-orm'

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  // This route doesn't need to load data, client uses localStorage + API
  return json({ ok: true })
}

export const action: ActionFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) throw new Response('Unauthorized', { status: 401 })

  const formData = await request.formData()
  const content = formData.get('content') as string
  const store = formData.get('store') as string | null

  if (!content?.trim()) {
    throw new Response('Content is required', { status: 400 })
  }

  const newItem: Item = {
    id: crypto.randomUUID(),
    content: content.trim(),
    store: store?.trim() || null,
    isCompleted: false,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(items).values(newItem)

  return json(newItem, { status: 201 })
}

export default function NewItem() {
  const actionData = useActionData<typeof action>()
  // This route is only for API calls, not directly rendered
  return null
}
