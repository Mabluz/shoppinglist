import { db } from './index'
import { items } from './schema'

export async function initDatabase() {
  try {
    console.log('🔍 Checking database...')

    // Create the items table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        store TEXT,
        is_completed BOOLEAN DEFAULT FALSE NOT NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    // Create indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_completed ON items(is_completed)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC)
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
