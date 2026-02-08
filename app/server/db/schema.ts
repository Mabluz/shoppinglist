import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const stores = pgTable('stores', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const items = pgTable('items', {
  id: text('id').primaryKey(), // UUID
  content: text('content').notNull(),
  storeId: text('store_id').references(() => stores.id, { onDelete: 'set null' }),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  order: integer('order').default(0).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const insertStoreSchema = createInsertSchema(stores)
export const selectStoreSchema = createSelectSchema(stores)

export const insertItemSchema = createInsertSchema(items)
export const selectItemSchema = createSelectSchema(items)

export type Store = z.infer<typeof selectStoreSchema>
export type Item = z.infer<typeof selectItemSchema>
