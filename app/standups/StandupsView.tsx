'use client'

import { useState, useEffect } from 'react'
import { getMyStandups, getAllStandups, createOrUpdateStandup, deleteStandup, type DailyStandup, type StandupItem, type StandupSubtitle, type StandupContent } from './actions'

type Props = {
  currentUserId: string
}

// Spinner Component
const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
)

export default function StandupsView({ currentUserId }: Props) {
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('mine')
  const [standups, setStandups] = useState<DailyStandup[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStandup, setEditingStandup] = useState<DailyStandup | null>(null)
  const [formItems, setFormItems] = useState<StandupItem[]>([
    { 
      title: '', 
      subtitles: [],
      contents: []
    }
  ])
  const [standupDate, setStandupDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStandups()
  }, [viewMode])

  const loadStandups = async () => {
    setLoading(true)
    const result = viewMode === 'mine' ? await getMyStandups() : await getAllStandups()
    if (result.data) {
      setStandups(result.data)
    }
    setLoading(false)
  }

  const openCreateModal = () => {
    setEditingStandup(null)
    setFormItems([{ 
      title: '', 
      subtitles: [],
      contents: []
    }])
    setStandupDate(new Date().toISOString().split('T')[0])
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (standup: DailyStandup) => {
    setEditingStandup(standup)
    setFormItems(standup.items.length > 0 ? standup.items : [{ 
      title: '', 
      subtitles: [],
      contents: []
    }])
    setStandupDate(standup.standup_date)
    setError(null)
    setIsModalOpen(true)
  }

  const addItem = () => {
    setFormItems([...formItems, { 
      title: '', 
      subtitles: [],
      contents: []
    }])
  }

  const removeItem = (index: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter((_, i) => i !== index))
    }
  }

  const updateItemTitle = (itemIndex: number, value: string) => {
    const newItems = [...formItems]
    newItems[itemIndex].title = value
    setFormItems(newItems)
  }

  const addSubtitle = (itemIndex: number) => {
    const newItems = [...formItems]
    newItems[itemIndex].subtitles.push({ subtitle: '', contents: [{ text: '' }] })
    setFormItems(newItems)
  }

  const removeSubtitle = (itemIndex: number, subIndex: number) => {
    const newItems = [...formItems]
    newItems[itemIndex].subtitles.splice(subIndex, 1)
    setFormItems(newItems)
  }

  const updateSubtitle = (itemIndex: number, subIndex: number, value: string) => {
    const newItems = [...formItems]
    newItems[itemIndex].subtitles[subIndex].subtitle = value
    setFormItems(newItems)
  }

  const addSubtitleContent = (itemIndex: number, subIndex: number) => {
    const newItems = [...formItems]
    newItems[itemIndex].subtitles[subIndex].contents.push({ text: '' })
    setFormItems(newItems)
  }

  const removeSubtitleContent = (itemIndex: number, subIndex: number, contentIndex: number) => {
    const newItems = [...formItems]
    if (newItems[itemIndex].subtitles[subIndex].contents.length > 1) {
      newItems[itemIndex].subtitles[subIndex].contents.splice(contentIndex, 1)
      setFormItems(newItems)
    }
  }

  const updateSubtitleContent = (itemIndex: number, subIndex: number, contentIndex: number, value: string) => {
    const newItems = [...formItems]
    newItems[itemIndex].subtitles[subIndex].contents[contentIndex].text = value
    setFormItems(newItems)
  }

  const addDirectContent = (itemIndex: number) => {
    const newItems = [...formItems]
    newItems[itemIndex].contents.push({ text: '' })
    setFormItems(newItems)
  }

  const removeDirectContent = (itemIndex: number, contentIndex: number) => {
    const newItems = [...formItems]
    if (newItems[itemIndex].contents.length > 1) {
      newItems[itemIndex].contents.splice(contentIndex, 1)
      setFormItems(newItems)
    }
  }

  const updateDirectContent = (itemIndex: number, contentIndex: number, value: string) => {
    const newItems = [...formItems]
    newItems[itemIndex].contents[contentIndex].text = value
    setFormItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validate and clean items
    const validItems = formItems.filter(item => {
      if (!item.title.trim()) return false
      
      // Clean subtitles
      item.subtitles = item.subtitles.filter(sub => {
        sub.contents = sub.contents.filter(c => c.text.trim())
        return sub.subtitle.trim() && sub.contents.length > 0
      })
      
      // Clean direct contents
      item.contents = item.contents.filter(c => c.text.trim())
      
      // Item is valid if it has either subtitles with contents or direct contents
      return item.subtitles.length > 0 || item.contents.length > 0
    })

    if (validItems.length === 0) {
      setError('Please add at least one item with title and content')
      setSubmitting(false)
      return
    }

    const formData = new FormData()
    formData.append('standup_date', standupDate)
    formData.append('items', JSON.stringify(validItems))

    const result = await createOrUpdateStandup(formData)

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      await loadStandups()
      setSubmitting(false)
      setIsModalOpen(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this standup?')) {
      return
    }

    setDeletingId(id)
    const result = await deleteStandup(id)

    if (result.error) {
      alert('Error: ' + result.error)
      setDeletingId(null)
    } else {
      await loadStandups()
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div>
      {/* Header with Toggle */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daily Standups</h2>
        
        <div className="flex items-center gap-4">
          {/* All/Mine Toggle */}
          <div className="flex items-center bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setViewMode('mine')}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'mine'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mine
            </button>
            <button
              onClick={() => setViewMode('all')}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              All
            </button>
          </div>

          {/* Add Button - Only show in "Mine" mode */}
          {viewMode === 'mine' && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              + Add Today's Standup
            </button>
          )}
        </div>
      </div>

      {/* Standups List */}
      {loading && standups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Spinner />
          <p className="text-gray-500 mt-4">Loading standups...</p>
        </div>
      ) : standups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No standups yet</p>
          {viewMode === 'mine' && (
            <button
              onClick={openCreateModal}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Add your first standup
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {standups.map((standup) => (
            <div key={standup.id} className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200 hover:border-indigo-300 transition-all">
              <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatDate(standup.standup_date)}
                    </p>
                    {viewMode === 'all' && standup.profiles && (
                      <p className="text-sm text-gray-600">
                        by {standup.profiles.name}
                      </p>
                    )}
                  </div>
                  {viewMode === 'mine' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(standup)}
                        disabled={deletingId === standup.id}
                        className="text-indigo-600 hover:text-indigo-900 text-sm disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(standup.id)}
                        disabled={deletingId === standup.id}
                        className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingId === standup.id ? (
                          <>
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </>
                        ) : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-4">
                  {standup.items.map((item, idx) => (
                    <div key={idx}>
                      {/* Title */}
                      <p className="font-bold text-gray-900 text-base mb-2">{item.title}</p>
                      
                      {/* Subtitles with their contents */}
                      {item.subtitles.map((subtitle, subIdx) => (
                        <div key={subIdx} className="ml-4 mb-3 border-l-4 border-indigo-300 pl-3">
                          <p className="font-semibold text-gray-800 text-sm mb-1">{subtitle.subtitle}</p>
                          <div className="ml-2 space-y-1">
                            {subtitle.contents.map((content, contentIdx) => (
                              <p key={contentIdx} className="text-sm text-gray-600 flex items-start">
                                <span className="mr-2 flex-shrink-0">•</span>
                                <span>{content.text}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {/* Direct contents (no subtitle) */}
                      {item.contents.length > 0 && (
                        <div className="ml-4 border-l-4 border-indigo-300 pl-3 space-y-1">
                          {item.contents.map((content, contentIdx) => (
                            <p key={contentIdx} className="text-sm text-gray-600 flex items-start">
                              <span className="mr-2 flex-shrink-0">•</span>
                              <span>{content.text}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingStandup ? 'Edit Standup' : 'Add Daily Standup'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Date */}
              <div className="mb-6">
                <label htmlFor="standup_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  id="standup_date"
                  value={standupDate}
                  onChange={(e) => setStandupDate(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {/* Dynamic Items */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    Standup Items
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                {formItems.map((item, itemIndex) => (
                  <div key={itemIndex} className="border-2 border-gray-200 rounded-lg p-4 relative bg-gray-50">
                    {formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(itemIndex)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    {/* Title */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItemTitle(itemIndex, e.target.value)}
                        placeholder="e.g., Completed Tasks, Today's Goals, Blockers"
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      />
                    </div>

                    {/* Subtitles Section */}
                    <div className="ml-4 space-y-3 mb-4">
                      {item.subtitles.map((subtitle, subIndex) => (
                        <div key={subIndex} className="border-l-2 border-indigo-300 pl-4 py-2 bg-white rounded">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-medium text-gray-600">
                              Subtitle {subIndex + 1}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeSubtitle(itemIndex, subIndex)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                          
                          <input
                            type="text"
                            value={subtitle.subtitle}
                            onChange={(e) => updateSubtitle(itemIndex, subIndex, e.target.value)}
                            placeholder="e.g., Backend Development, Bug Fixes"
                            className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm mb-2"
                          />

                          {/* Contents under this subtitle */}
                          <div className="ml-4 space-y-2">
                            {subtitle.contents.map((content, contentIndex) => (
                              <div key={contentIndex} className="flex gap-2 items-start">
                                <span className="text-gray-600 mt-1 flex-shrink-0">•</span>
                                <input
                                  type="text"
                                  value={content.text}
                                  onChange={(e) => updateSubtitleContent(itemIndex, subIndex, contentIndex, e.target.value)}
                                  placeholder="Content item"
                                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                />
                                {subtitle.contents.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeSubtitleContent(itemIndex, subIndex, contentIndex)}
                                    className="text-red-600 hover:text-red-800 flex-shrink-0"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addSubtitleContent(itemIndex, subIndex)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 ml-5"
                            >
                              + Add content
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addSubtitle(itemIndex)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        + Add Subtitle
                      </button>
                    </div>

                    {/* Direct Contents (without subtitle) */}
                    {(item.contents.length > 0 || item.subtitles.length === 0) && (
                      <div className="ml-4 mt-4 space-y-2 border-t pt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Direct Contents (without subtitle)
                        </label>
                        {item.contents.map((content, contentIndex) => (
                          <div key={contentIndex} className="flex gap-2 items-start">
                            <span className="text-gray-600 mt-1 flex-shrink-0">•</span>
                            <input
                              type="text"
                              value={content.text}
                              onChange={(e) => updateDirectContent(itemIndex, contentIndex, e.target.value)}
                              placeholder="Content item"
                              className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                            {item.contents.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDirectContent(itemIndex, contentIndex)}
                                className="text-red-600 hover:text-red-800 flex-shrink-0"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addDirectContent(itemIndex)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 ml-5"
                        >
                          + Add direct content
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : editingStandup ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && standups.length > 0 && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <Spinner />
            <p className="mt-4 text-sm text-gray-700 font-medium text-center">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}
