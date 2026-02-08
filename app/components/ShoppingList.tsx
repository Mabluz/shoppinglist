import { useState, useEffect, useCallback, useRef } from 'react'
import { Item } from '~/server/db/schema'

interface ShoppingListProps {
  initialItems: Item[]
  stores: string[]
}

export default function ShoppingList({ initialItems, stores }: ShoppingListProps) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [newItemContent, setNewItemContent] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single'; id: string } | { type: 'clear' } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Get all distinct item contents for suggestions
  const allItemContents = Array.from(new Set(items.map(item => item.content)))

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

  // Get suggestions based on input
  const getSuggestions = useCallback((value: string) => {
    if (!value.trim()) return []
    return allItemContents
      .filter(item => item.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 5) // Limit to 5 suggestions
  }, [allItemContents])

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

    const newItem: Item = {
      id: crypto.randomUUID(),
      content: newItemContent.trim(),
      store: selectedStore.trim() || null,
      isCompleted: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setItems(prev => [newItem, ...prev])
    setNewItemContent('')
    setSearchTerm('')
    setShowSuggestions(false)

    // Sync to server (fire and forget)
    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
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
  const toggleComplete = async (item: Item) => {
    const updated = { ...item, isCompleted: !item.isCompleted, completedAt: item.isCompleted ? null : new Date().toISOString() }

    setItems(prev => prev.map(i => i.id === item.id ? updated : i))

    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(console.error)
  }

  // Request delete (show modal)
  const requestDelete = (item: Item) => {
    setDeleteTarget({ type: 'single', id: item.id })
  }

  // Request clear all completed
  const requestClearCompleted = () => {
    setDeleteTarget({ type: 'clear' })
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
  const displayedItems = selectedStore
    ? items.filter(item => item.store === selectedStore)
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
        <h1>Shopping List</h1>
        <p className="header-subtitle">Add items quickly, check them off</p>
      </header>

      <div className="content">
        {/* Store selector */}
        <div className="store-section">
          <label className="store-label" htmlFor="store">Butikk (valgfritt)</label>
          <select
            id="store"
            className="store-input"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="">Alle butikker</option>
            {stores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
        </div>

        {/* Add item form */}
        <div style={{ position: 'relative' }}>
          <div className="add-item-form">
            <input
              ref={inputRef}
              type="text"
              className="add-item-input"
              placeholder="Legg til ny vare..."
              value={newItemContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchTerm && getSuggestions(searchTerm).length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
            />
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
            <p>ingen varer i listen</p>
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
                    {item.store && (
                      <span className="item-store">{item.store}</span>
                    )}
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => requestDelete(item)}
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
                  Fjern {completedCount} {completedCount === 1 ? 'faredig' : 'færdige'} vare
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
