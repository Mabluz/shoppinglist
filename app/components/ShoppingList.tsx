import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@remix-run/react'
import type { Store } from '~/server/db/schema'

interface ItemWithStore {
  id: string
  content: string
  storeId: string | null
  storeName: string | null
  isCompleted: boolean
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface ShoppingListProps {
  initialItems: ItemWithStore[]
  stores: Store[]
}

interface Suggestion {
  content: string
  count: number
  lastUsed: string
}

export default function ShoppingList({ initialItems, stores }: ShoppingListProps) {
  const [items, setItems] = useState<ItemWithStore[]>(initialItems)
  const [newItemContent, setNewItemContent] = useState('')
  const [newItemStoreId, setNewItemStoreId] = useState('')
  const [filterStoreId, setFilterStoreId] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single'; id: string } | { type: 'clear' } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editStoreIdValue, setEditStoreIdValue] = useState('')
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Monitor scroll to hide subtitle when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Update last sync time whenever items change
  useEffect(() => {
    if (items.length > 0) {
      setLastSync(new Date())
    }
  }, [items])

  // PWA Install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Check if already installed or dismissed
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches

      if (!dismissed && !isStandalone) {
        setShowInstallPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      // PWA install accepted
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismissInstall = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Save to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('shoppinglist-items', JSON.stringify(items))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }, [items])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shoppinglist-items')
      if (saved) {
        const parsed = JSON.parse(saved)
        setItems(parsed)
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
  }, [])

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch('/api/suggestions')
      if (response.ok) {
        const data = await response.json()
        setAllSuggestions(data)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    }
  }, [])

  // Load suggestions on mount
  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  // When filter changes, default the add-item store selector to the filtered store
  useEffect(() => {
    if (filterStoreId) {
      setNewItemStoreId(filterStoreId)
    }
  }, [filterStoreId])


  // Get suggestions based on input from history (sorted by frequency and recency)
  const getSuggestions = useCallback((value: string) => {
    if (!value.trim()) return []
    return allSuggestions
      .filter(h => h.content.toLowerCase().startsWith(value.toLowerCase()))
      .sort((a, b) => {
        // Sort by count (descending), then by lastUsed (most recent first)
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      })
      .map(h => h.content)
      .slice(0, 5) // Limit to 5 suggestions
  }, [allSuggestions])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewItemContent(value)
    setSearchTerm(value)

    if (value.trim()) {
      const sugg = getSuggestions(value)
      setSuggestions(sugg)
      setShowSuggestions(sugg.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  // Select a suggestion
  const selectSuggestion = (suggestion: string) => {
    setNewItemContent(suggestion)
    setSearchTerm('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Add new item
  const handleAddItem = async () => {
    if (!newItemContent.trim()) return

    const selectedStore = stores.find(s => s.id === newItemStoreId)
    const newItem: ItemWithStore = {
      id: crypto.randomUUID(),
      content: newItemContent.trim(),
      storeId: newItemStoreId || null,
      storeName: selectedStore?.name || null,
      isCompleted: false,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setItems(prev => [newItem, ...prev])

    setNewItemContent('')
    // Only reset store selection if there's an active filter
    // Otherwise, remember the last selected store for convenience
    if (filterStoreId) {
      setNewItemStoreId(filterStoreId)
    }
    setSearchTerm('')
    setShowSuggestions(false)

    // Sync to server and refresh suggestions
    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newItem.id,
        content: newItem.content,
        storeId: newItem.storeId,
        isCompleted: newItem.isCompleted,
        completedAt: newItem.completedAt,
        createdAt: newItem.createdAt,
        updatedAt: newItem.updatedAt,
      }),
    }).then(() => {
      // Refresh suggestions after adding item
      fetchSuggestions()
    }).catch(console.error)
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showSuggestions) {
      e.preventDefault()
      handleAddItem()
    }
  }

  // Toggle item completion (strikethrough)
  const toggleComplete = async (item: ItemWithStore) => {
    const updated = { ...item, isCompleted: !item.isCompleted, completedAt: item.isCompleted ? null : new Date() }

    setItems(prev => prev.map(i => i.id === item.id ? updated : i))

    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isCompleted: updated.isCompleted,
        completedAt: updated.completedAt,
      }),
    }).catch(console.error)
  }

  // Handle delete button click
  const handleDeleteClick = (item: ItemWithStore) => {
    if (item.isCompleted) {
      // If already completed, show delete confirmation
      setDeleteTarget({ type: 'single', id: item.id })
      setShowDeleteModal(true)
    } else {
      // If not completed, mark as completed first
      toggleComplete(item)
    }
  }

  // Request clear all completed
  const requestClearCompleted = () => {
    setDeleteTarget({ type: 'clear' })
    setShowDeleteModal(true)
  }

  // Start editing item store
  const startEditingStore = (item: ItemWithStore) => {
    setEditingItemId(item.id)
    setEditStoreIdValue(item.storeId || '')
  }

  // Save edited store
  const saveEditedStore = async (item: ItemWithStore) => {
    const selectedStore = stores.find(s => s.id === editStoreIdValue)
    const updated = {
      ...item,
      storeId: editStoreIdValue || null,
      storeName: selectedStore?.name || null,
      updatedAt: new Date()
    }

    setItems(prev => prev.map(i => i.id === item.id ? updated : i))
    setEditingItemId(null)
    setEditStoreIdValue('')

    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: updated.storeId }),
    }).catch(console.error)
  }

  // Cancel editing store
  const cancelEditingStore = () => {
    setEditingItemId(null)
    setEditStoreIdValue('')
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'single') {
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
      await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' }).catch(console.error)
    } else {
      const completedItems = items.filter(i => i.isCompleted)
      setItems(prev => prev.filter(i => !i.isCompleted))
      // Delete all completed from server in parallel
      await Promise.all(
        completedItems.map(item =>
          fetch(`/api/items/${item.id}`, { method: 'DELETE' }).catch(console.error)
        )
      )
    }

    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  // Filter items by store if selected
  const displayedItems = filterStoreId
    ? items.filter(item => item.storeId === filterStoreId)
    : items

  // Sort: incomplete first, then by creation date
  const sortedItems = [...displayedItems].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    return a.isCompleted ? 1 : -1
  })

  const completedCount = items.filter(i => i.isCompleted).length

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>Handleliste</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/suggestions" className="manage-stores-link">Forslag</Link>
            <Link to="/stores" className="manage-stores-link">Butikker</Link>
          </div>
        </div>
        {!isScrolled && <p className="header-subtitle">Legg til ting fort, for så å sjekke de av</p>}
      </header>

      {/* Offline/Online Status Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <span className="offline-icon">📡</span>
          <div className="offline-text">
            <strong>Offline modus</strong>
            <span className="offline-subtext">
              {lastSync
                ? `Viser data fra ${new Date(lastSync).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`
                : 'Ingen tilkobling'}
            </span>
          </div>
        </div>
      )}

      {/* Install App Prompt */}
      {showInstallPrompt && (
        <div className="install-banner">
          <div className="install-content">
            <span className="install-icon">📱</span>
            <div className="install-text">
              <strong>Installer appen</strong>
              <span className="install-subtext">Få rask tilgang og bruk offline</span>
            </div>
          </div>
          <div className="install-actions">
            <button className="install-button" onClick={handleInstallClick}>
              Installer
            </button>
            <button className="dismiss-button" onClick={handleDismissInstall}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="content">
        {/* Store filter */}
        <div className="store-section">
          <label className="store-label" htmlFor="filter-store">Filter etter butikk</label>
          <select
            id="filter-store"
            className="store-input"
            value={filterStoreId}
            onChange={(e) => setFilterStoreId(e.target.value)}
          >
            <option value="">Alle butikker</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>

        {/* Add item form */}
        <div style={{ position: 'relative' }}>
          <div className="add-item-form">
            <input
              ref={inputRef}
              type="text"
              id="new-item-content"
              name="newItemContent"
              className="add-item-input"
              placeholder="Legg til ny vare..."
              value={newItemContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchTerm && getSuggestions(searchTerm).length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
            />
            <select
              id="new-item-store"
              name="newItemStore"
              className="add-item-input store-input-inline"
              value={newItemStoreId}
              onChange={(e) => setNewItemStoreId(e.target.value)}
            >
              <option value="">Ingen butikk</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <button className="add-item-button" onClick={handleAddItem} disabled={!newItemContent.trim()}>
              Legg til
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="suggestions">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items list */}
        {sortedItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <p>Ingen varer i listen</p>
          </div>
        ) : (
          <>
            <ul className="items-list">
              {sortedItems.map(item => (
                <li key={item.id} className={`item-row ${item.isCompleted ? 'completed' : ''}`}>
                  <div className="item-content">
                    <span
                      className={`item-text ${item.isCompleted ? 'completed' : ''}`}
                      onClick={() => toggleComplete(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      {item.content}
                    </span>
                    {editingItemId === item.id ? (
                      <div className="edit-store-form">
                        <select
                          className="edit-store-input"
                          value={editStoreIdValue}
                          onChange={(e) => setEditStoreIdValue(e.target.value)}
                          autoFocus
                        >
                          <option value="">Ingen butikk</option>
                          {stores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                          ))}
                        </select>
                        <button className="save-store-button" onClick={() => saveEditedStore(item)}>✓</button>
                        <button className="cancel-store-button" onClick={cancelEditingStore}>✕</button>
                      </div>
                    ) : (
                      <span
                        className="item-store"
                        onClick={() => startEditingStore(item)}
                        title="Klikk for å endre butikk"
                      >
                        {item.storeName || '+ Legg til butikk'}
                      </span>
                    )}
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteClick(item)}
                    title={item.isCompleted ? 'Slett' : 'Ferdig?'}
                  >
                    {item.isCompleted ? '🗑' : '✓'}
                  </button>
                </li>
              ))}
            </ul>

            {/* Clear completed button */}
            {completedCount > 0 && (
              <div className="actions">
                <button className="clear-completed-button" onClick={requestClearCompleted}>
                  Fjern {completedCount} {completedCount === 1 ? 'ferdig' : 'ferdige'} vare
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>
              {deleteTarget?.type === 'clear'
                ? 'Fjern alle ferdige varer?'
                : 'Slett vare?'}
            </h2>
            <p>
              {deleteTarget?.type === 'clear'
                ? `Dette vil permanent slette ${completedCount} ferdig(mer)ket varer.`
                : 'Denne handlingen kan ikke angres.'}
            </p>
            <div className="modal-actions">
              <button className="modal-button cancel" onClick={cancelDelete}>Avbryt</button>
              <button className="modal-button danger" onClick={confirmDelete}>
                {deleteTarget?.type === 'clear' ? 'Fjern' : 'Slett'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
