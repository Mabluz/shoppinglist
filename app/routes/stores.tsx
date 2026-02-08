import type { MetaFunction, LoaderFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { useLoaderData, Link, useFetcher } from '@remix-run/react'
import { verifySession } from '~/server/auth'
import { db } from '~/server/db'
import { stores, items } from '~/server/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { useState } from 'react'

export const meta: MetaFunction = () => {
  return [
    { title: 'Butikker - Shopping List' },
    { name: 'description', content: 'Manage your stores' },
  ]
}

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) {
    return redirect('/login')
  }

  // Fetch all stores with item counts
  const allStores = await db.select().from(stores).orderBy(stores.name)

  // Get item counts for each store
  const storeCounts = await Promise.all(
    allStores.map(async (store) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(items)
        .where(eq(items.storeId, store.id))
      return { ...store, itemCount: count[0].count }
    })
  )

  return json({ stores: storeCounts })
}

export default function Stores() {
  const { stores } = useLoaderData<typeof loader>()
  const [newStoreName, setNewStoreName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState('')

  const createStore = async () => {
    if (!newStoreName.trim()) return

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStoreName.trim() }),
      })

      if (!response.ok) {
        const text = await response.text()
        setError(text || 'Failed to create store')
        return
      }

      setNewStoreName('')
      setError('')
      window.location.reload()
    } catch (err) {
      setError('Failed to create store')
    }
  }

  const startEdit = (store: any) => {
    setEditingId(store.id)
    setEditValue(store.name)
    setError('')
  }

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return

    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })

      if (!response.ok) {
        const text = await response.text()
        setError(text || 'Failed to update store')
        return
      }

      setEditingId(null)
      setEditValue('')
      setError('')
      window.location.reload()
    } catch (err) {
      setError('Failed to update store')
    }
  }

  const deleteStore = async (id: string, itemCount: number) => {
    if (itemCount > 0) {
      setError(`Kan ikke slette butikk med ${itemCount} varer. Flytt eller slett varene først.`)
      return
    }

    if (!confirm('Er du sikker på at du vil slette denne butikken?')) {
      return
    }

    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const text = await response.text()
        setError(text || 'Failed to delete store')
        return
      }

      setError('')
      window.location.reload()
    } catch (err) {
      setError('Failed to delete store')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
    setError('')
  }

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" className="back-link">← Tilbake</Link>
          <h1>Butikker</h1>
          <div style={{ width: '70px' }} /> {/* Spacer for centering */}
        </div>
      </header>

      <div className="content">
        {/* Add new store */}
        <div className="store-section">
          <h2 className="section-title">Legg til ny butikk</h2>
          <div className="add-item-form">
            <input
              type="text"
              className="add-item-input"
              placeholder="Butikknavn..."
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createStore()}
            />
            <button
              className="add-item-button"
              onClick={createStore}
              disabled={!newStoreName.trim()}
            >
              Legg til
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message" style={{ marginTop: '1rem', padding: '1rem', background: '#fee', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        {/* Stores list */}
        <div className="store-section" style={{ marginTop: '2rem' }}>
          <h2 className="section-title">Dine butikker ({stores.length})</h2>
          {stores.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              Ingen butikker ennå. Legg til din første butikk ovenfor.
            </p>
          ) : (
            <ul className="stores-list">
              {stores.map((store: any) => (
                <li key={store.id} className="store-item">
                  {editingId === store.id ? (
                    <div className="edit-store-row">
                      <input
                        type="text"
                        className="edit-store-input-full"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(store.id)}
                        autoFocus
                      />
                      <button
                        className="store-action-button save"
                        onClick={() => saveEdit(store.id)}
                      >
                        ✓
                      </button>
                      <button
                        className="store-action-button cancel"
                        onClick={cancelEdit}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="store-info">
                        <span className="store-name">{store.name}</span>
                        <span className="store-count">
                          {store.itemCount} {store.itemCount === 1 ? 'vare' : 'varer'}
                        </span>
                      </div>
                      <div className="store-actions">
                        <button
                          className="store-action-button edit"
                          onClick={() => startEdit(store)}
                        >
                          ✏️
                        </button>
                        <button
                          className="store-action-button delete"
                          onClick={() => deleteStore(store.id, store.itemCount)}
                          disabled={store.itemCount > 0}
                          title={
                            store.itemCount > 0
                              ? 'Kan ikke slette butikk med varer'
                              : 'Slett butikk'
                          }
                        >
                          🗑
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
