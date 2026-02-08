import type { MetaFunction, LoaderFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { verifySession } from '~/server/auth'
import { db } from '~/server/db'
import { items } from '~/server/db/schema'
import { sql, eq } from 'drizzle-orm'
import { useState } from 'react'

export const meta: MetaFunction = () => {
  return [
    { title: 'Forslag - Handleliste' },
    { name: 'description', content: 'Manage your shopping suggestions' },
  ]
}

interface SuggestionWithStatus {
  content: string
  count: number
  lastUsed: string
  activeCount: number
  deletedCount: number
}

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const isValid = await verifySession(cookieHeader)
  if (!isValid) {
    return redirect('/login')
  }

  // Get all unique item contents with counts split by active/deleted status
  const suggestions = await db
    .select({
      content: items.content,
      count: sql<number>`count(*)::int`,
      lastUsed: sql<string>`max(${items.createdAt})`,
      activeCount: sql<number>`count(*) FILTER (WHERE ${items.isDeleted} = false)::int`,
      deletedCount: sql<number>`count(*) FILTER (WHERE ${items.isDeleted} = true)::int`,
    })
    .from(items)
    .groupBy(items.content)
    .orderBy(items.content)

  return json({ suggestions })
}

export default function Suggestions() {
  const { suggestions } = useLoaderData<typeof loader>()
  const [deletingContent, setDeletingContent] = useState<string | null>(null)
  const [error, setError] = useState('')

  const deleteSuggestion = async (content: string) => {
    if (!confirm(`Er du sikker på at du vil permanent slette alle "${content}" fra forslagene?`)) {
      return
    }

    setDeletingContent(content)
    setError('')

    try {
      const response = await fetch(`/api/suggestions/${encodeURIComponent(content)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const text = await response.text()
        setError(text || 'Kunne ikke slette forslag')
        setDeletingContent(null)
        return
      }

      // Reload to show updated list
      window.location.reload()
    } catch (err) {
      setError('Kunne ikke slette forslag')
      setDeletingContent(null)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" className="back-link">← Tilbake</Link>
          <h1>Forslag</h1>
          <div style={{ width: '70px' }} /> {/* Spacer for centering */}
        </div>
        <p className="header-subtitle">
          Administrer autofullfør-forslag basert på tidligere varer
        </p>
      </header>

      <div className="content">
        {error && (
          <div className="error-message" style={{ marginTop: '1rem', padding: '1rem', background: '#fee', borderRadius: '6px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Suggestions list */}
        <div className="store-section">
          <h2 className="section-title">Alle forslag ({suggestions.length})</h2>
          <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Disse varene vises i autofullfør når du skriver. Slett permanent hvis du ikke vil se dem igjen.
          </p>

          {suggestions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              Ingen forslag ennå. Legg til noen varer først!
            </p>
          ) : (
            <ul className="stores-list">
              {suggestions.map((suggestion: SuggestionWithStatus) => (
                <li key={suggestion.content} className="store-item">
                  <div className="store-info">
                    <span className="store-name">{suggestion.content}</span>
                    <span className="store-count">
                      Brukt {suggestion.count} {suggestion.count === 1 ? 'gang' : 'ganger'}
                      {suggestion.deletedCount > 0 && (
                        <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.85em' }}>
                          ({suggestion.deletedCount} slettet)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="store-actions">
                    <button
                      className="store-action-button delete"
                      onClick={() => deleteSuggestion(suggestion.content)}
                      disabled={deletingContent === suggestion.content}
                      title="Slett permanent fra forslag"
                    >
                      {deletingContent === suggestion.content ? '⏳' : '🗑'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.95rem' }}>💡 Tips</h3>
          <ul style={{ marginBottom: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
            <li>Forslag er delt mellom alle brukere av appen</li>
            <li>Når du sletter den siste varen med et navn, blir den "skjult" men forblir i forslagene</li>
            <li>Bruk denne siden for å permanent slette forslag du ikke vil se igjen</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
