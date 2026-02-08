import { db } from './index'
import { items } from './schema'

async function initDatabase() {
  console.log('Initializing database...')

  // Create the items table if it doesn't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      store TEXT,
      is_completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Create indexes
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_items_completed ON items(is_completed)
  `)

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC)
  `)

  console.log('✅ Database initialized successfully')
}

initDatabase().catch((error) => {
  console.error('❌ Database initialization failed:', error)
  process.exit(1)
})
