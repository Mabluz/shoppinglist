import type { LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { db } from '~/server/db'
import { items } from '~/server/db/schema'
import { verifySession } from '~/server/auth'
import { sql } from 'drizzle-orm'

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('Cookie')
    const isValid = await verifySession(cookieHeader)
    if (!isValid) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unique item contents with their frequency and most recent usage
    // Include both active and soft-deleted items for suggestions
    const suggestions = await db
      .select({
        content: items.content,
        count: sql<number>`count(*)::int`,
        lastUsed: sql<string>`max(${items.createdAt})`,
      })
      .from(items)
      .groupBy(items.content)
      .orderBy(sql`count(*) DESC, max(${items.createdAt}) DESC`)

    return json(suggestions)
  } catch (error) {
    console.error('❌ Error fetching suggestions:', error)
    return json({ error: 'Failed to fetch suggestions', details: String(error) }, { status: 500 })
  }
}
