import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const items = pgTable('items', {
  id: text('id').primaryKey(), // UUID
  content: text('content').notNull(),
  store: text('store'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const insertItemSchema = createInsertSchema(items)
export const selectItemSchema = createSelectSchema(items)

export type Item = z.infer<typeof selectItemSchema>
