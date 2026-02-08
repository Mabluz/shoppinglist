import 'dotenv/config'
import crypto from 'crypto'
import { db } from './index'
import { items } from './schema'

export async function initDatabase() {
  try {
    console.log('🔍 Checking database...')

    // Create the stores table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    // Check if items table exists
    const tableExists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'items'
      ) as exists
    `)

    if (!tableExists[0].exists) {
      // Create new items table with store_id
      await db.execute(`
        CREATE TABLE items (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
          is_completed BOOLEAN DEFAULT FALSE NOT NULL,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `)
    } else {
      // Check if items table has old 'store' column (for migration)
      const checkOldColumn = await db.execute(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'store'
      `)

      // Check if store_id column exists
      const checkNewColumn = await db.execute(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'store_id'
      `)

      // Migrate old store column to new structure if needed
      if (checkOldColumn.length > 0 && checkNewColumn.length === 0) {
        console.log('📦 Migrating old store data...')

        // Add store_id column
        await db.execute(`
          ALTER TABLE items ADD COLUMN store_id TEXT REFERENCES stores(id) ON DELETE SET NULL
        `)

        // Get distinct stores from old column
        const oldStores = await db.execute(`
          SELECT DISTINCT store FROM items WHERE store IS NOT NULL AND store != ''
        `)

        // Insert into stores table
        for (const row of oldStores) {
          const storeId = crypto.randomUUID()
          try {
            await db.execute(`
              INSERT INTO stores (id, name, created_at, updated_at)
              VALUES ('${storeId}', '${row.store}', NOW(), NOW())
              ON CONFLICT (name) DO NOTHING
            `)
          } catch (err) {
            // Ignore duplicate errors
          }
        }

        // Update items to reference new stores
        for (const row of oldStores) {
          await db.execute(`
            UPDATE items
            SET store_id = (SELECT id FROM stores WHERE name = '${row.store}')
            WHERE store = '${row.store}'
          `)
        }

        // Drop old column
        await db.execute(`ALTER TABLE items DROP COLUMN store`)
        console.log('✅ Migration complete')
      } else if (checkNewColumn.length === 0) {
        // Add store_id column if it doesn't exist
        await db.execute(`
          ALTER TABLE items ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES stores(id) ON DELETE SET NULL
        `)
      }

      // Check if is_deleted column exists
      const checkIsDeletedColumn = await db.execute(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'is_deleted'
      `)

      // Add is_deleted column if it doesn't exist
      if (checkIsDeletedColumn.length === 0) {
        console.log('📦 Adding is_deleted column...')
        await db.execute(`
          ALTER TABLE items ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL
        `)
        console.log('✅ is_deleted column added')
      }

      // Check if order column exists
      const checkOrderColumn = await db.execute(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'order'
      `)

      // Add order column if it doesn't exist
      if (checkOrderColumn.length === 0) {
        console.log('📦 Adding order column...')
        await db.execute(`
          ALTER TABLE items ADD COLUMN "order" INTEGER DEFAULT 0 NOT NULL
        `)
        // Set order based on created_at for existing items
        await db.execute(`
          UPDATE items SET "order" = subquery.row_num
          FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 as row_num
            FROM items
          ) AS subquery
          WHERE items.id = subquery.id
        `)
        console.log('✅ order column added')
      }

      // Check if quantity column exists
      const checkQuantityColumn = await db.execute(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'quantity'
      `)

      // Add quantity column if it doesn't exist
      if (checkQuantityColumn.length === 0) {
        console.log('📦 Adding quantity column...')
        await db.execute(`
          ALTER TABLE items ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL
        `)
        console.log('✅ quantity column added')
      }
    }

    // Create indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_completed ON items(is_completed)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_store_id ON items(store_id)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_order ON items("order")
    `)

    console.log('✅ Database ready')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// Allow running directly with: npm run db:init
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
