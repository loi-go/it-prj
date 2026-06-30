'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { getMyStandups, getAllStandups, createOrUpdateStandup, submitFollowup, deleteStandup, type DailyStandup } from './actions'
import DateRangeFilter from './DateRangeFilter'
import Spinner from '@/app/components/Spinner'
import {
  getDefaultStandupDateRange,
  getLocalDateString,
  getStandupsCutoffDate,
  formatDateLabel,
} from './utils'

type Props = {
  currentUserId: string
  initialViewMode?: 'all' | 'mine'
}

type FormType = 'plan' | 'followup'

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mt-3 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-foreground mt-2.5 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-2 mb-0.5">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-secondary mt-2 mb-0.5">{children}</h4>,
  h5: ({ children }) => <h5 className="text-xs font-semibold text-secondary mt-1.5 mb-0.5 uppercase tracking-wide">{children}</h5>,
  h6: ({ children }) => <h6 className="text-xs font-medium text-muted mt-1.5 mb-0.5 uppercase tracking-wide">{children}</h6>,
  p:  ({ children }) => <p className="text-sm text-secondary mb-1.5 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside text-sm text-secondary mb-1.5 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-secondary mb-1.5 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-secondary">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-secondary">{children}</em>,
  code: ({ children }) => <code className="bg-elevated-muted text-accent rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-border pl-3 text-muted italic my-1.5">{children}</blockquote>,
}

const Md = ({ text }: { text: string }) => (
  <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>
)

const getLocalDate = getLocalDateString

export default function StandupsView({ currentUserId, initialViewMode = 'mine' }: Props) {
  const defaultDateRange = getDefaultStandupDateRange()
  const [viewMode] = useState<'all' | 'mine'>(initialViewMode)
  const [standups, setStandups] = useState<DailyStandup[]>([])
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from)
  const [dateTo, setDateTo] = useState(defaultDateRange.to)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formType, setFormType] = useState<FormType>('plan')
  const [editingStandup, setEditingStandup] = useState<DailyStandup | null>(null)
  const [followupTargetId, setFollowupTargetId] = useState<string | null>(null)
  const [formText, setFormText] = useState('')
  const [standupDate, setStandupDate] = useState(getLocalDate)
  const [error, setError] = useState<string | null>(null)

  const today = getLocalDate()

  useEffect(() => {
    loadStandups()
  }, [viewMode, dateFrom, dateTo])

  const loadStandups = async () => {
    setLoading(true)
    const range = { from: dateFrom, to: dateTo }
    const result = viewMode === 'mine' ? await getMyStandups(range) : await getAllStandups(range)
    if (result.data) setStandups(result.data)
    setLoading(false)
  }

  const applyPreset = (days: number) => {
    setDateFrom(getStandupsCutoffDate(days))
    setDateTo(getLocalDate())
  }

  const resetDateRange = () => {
    const defaults = getDefaultStandupDateRange()
    setDateFrom(defaults.from)
    setDateTo(defaults.to)
  }

  const isDateRangeActive =
    dateFrom !== defaultDateRange.from || dateTo !== defaultDateRange.to

  const openPlanModal = (existing?: DailyStandup) => {
    setFormType('plan')
    setFollowupTargetId(null)
    if (existing) {
      setEditingStandup(existing)
      setFormText(existing.plan)
      setStandupDate(existing.standup_date)
    } else {
      setEditingStandup(null)
      setFormText('')
      setStandupDate(today)
    }
    setError(null)
    setIsModalOpen(true)
  }

  const openFollowupModal = (standup: DailyStandup) => {
    setFormType('followup')
    setFollowupTargetId(standup.id)
    setEditingStandup(standup)
    setFormText(standup.followup ?? '')
    setError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const text = formText.trim()
    if (!text) {
      setError('Please write something.')
      setSubmitting(false)
      return
    }

    if (formType === 'followup' && followupTargetId) {
      const result = await submitFollowup(followupTargetId, text)
      if (result.error) {
        setError(result.error)
        setSubmitting(false)
      } else {
        await loadStandups()
        setSubmitting(false)
        setIsModalOpen(false)
      }
    } else {
      const result = await createOrUpdateStandup(standupDate, text)
      if (result.error) {
        setError(result.error)
        setSubmitting(false)
      } else {
        await loadStandups()
        setSubmitting(false)
        setIsModalOpen(false)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this standup?')) return
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
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const todayStandup = standups.find(s => s.standup_date === today)
  const pastStandups = standups.filter(s => s.standup_date !== today)

  // For the "All" view, group standups by date so that each
  // day is rendered together under a date heading.
  const groupedAllStandupsByDate =
    viewMode === 'all'
      ? standups.reduce<{ date: string; items: DailyStandup[] }[]>((groups, standup) => {
          const lastGroup = groups[groups.length - 1]

          if (!lastGroup || lastGroup.date !== standup.standup_date) {
            groups.push({ date: standup.standup_date, items: [standup] })
          } else {
            lastGroup.items.push(standup)
          }

          return groups
        }, [])
      : []

  const renderStandupCard = (standup: DailyStandup, isToday = false) => {
    const hasFollowup = standup.followup && standup.followup.trim().length > 0
    const isMine = viewMode === 'mine'

    return (
      <div key={standup.id} className="card shadow-card hover:border-accent/30 transition-all">
        <div className="p-5">
          {/* Card Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-base font-bold text-foreground">
                {isToday ? 'Today' : formatDate(standup.standup_date)}
              </p>
              {isToday && (
                <p className="text-xs text-muted/70 mt-0.5 text-foreground bg-elevated">{formatDate(standup.standup_date)}</p>
              )}
              {viewMode === 'all' && standup.profiles && (
                <p className="text-sm text-muted mt-0.5">by {standup.profiles.name}</p>
              )}
            </div>
            {isMine && !hasFollowup && (
              <div className="flex gap-3">
                <button
                  onClick={() => openPlanModal(standup)}
                  disabled={deletingId === standup.id}
                  className="text-accent hover:text-accent-hover text-sm disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(standup.id)}
                  disabled={deletingId === standup.id}
                  className="text-red-400 hover:text-red-600 text-sm disabled:opacity-50 flex items-center gap-1"
                >
                  {deletingId === standup.id ? (
                    <>
                      <Spinner size="xs" />
                      Deleting...
                    </>
                  ) : 'Delete'}
                </button>
              </div>
            )}
          </div>

          {/* Daily Plan */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">📋</span>
              <h4 className="text-xs font-semibold text-accent uppercase tracking-wider">Daily Plan</h4>
            </div>
            <Md text={standup.plan} />
          </div>

          {/* Follow-up */}
          {hasFollowup ? (
            <div className="border-t border-border-subtle pt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">✅</span>
                <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider">Follow-up</h4>
                {isMine && isToday && (
                  <button
                    onClick={() => openFollowupModal(standup)}
                    className="ml-auto text-xs text-muted/70 hover:text-muted"
                  >
                    Edit
                  </button>
                )}
              </div>
              <Md text={standup.followup!} />
            </div>
          ) : isMine ? (
            <div className="border-t border-border-subtle pt-4">
              <button
                onClick={() => openFollowupModal(standup)}
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 border border-green-200 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <span>✅</span>
                Submit Follow-up
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="heading-page">
          {viewMode === 'mine' ? 'My Daily Standups' : 'All Daily Standups'}
        </h2>
      </div>

      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onPreset={applyPreset}
        onReset={resetDateRange}
        isActive={isDateRangeActive}
        resultCount={standups.length}
        formatDateLabel={formatDateLabel}
      />

      {loading && standups.length === 0 ? (
        <div className="bg-elevated rounded-lg shadow p-8 text-center">
          <div className="flex justify-center"><Spinner size="md" /></div>
          <p className="text-muted mt-4">Loading standups...</p>
        </div>
      ) : (
        <>
          {/* Today — Mine only */}
          {viewMode === 'mine' && (
            <div className="mb-8">
              <h3 className="heading-section mb-3">Today</h3>
              {todayStandup ? (
                renderStandupCard(todayStandup, true)
              ) : (
                <div className="card-flat border-2 border-dashed border-accent/30 p-8 text-center">
                  <p className="text-muted text-sm mb-4">You haven&apos;t submitted your daily plan yet.</p>
                  <button
                    onClick={() => openPlanModal()}
                    className="btn-primary"
                  >
                    <span>📋</span>
                    Submit Daily Plan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Past / All */}
          {(viewMode === 'mine' ? pastStandups : standups).length === 0 ? (
            viewMode === 'mine' ? (
              <p className="text-center text-muted/70 text-sm py-4">
                {isDateRangeActive ? 'No standups in this date range.' : 'No past standups yet.'}
              </p>
            ) : (
              <div className="bg-elevated rounded-lg shadow p-8 text-center">
                <p className="text-muted">
                  {isDateRangeActive ? 'No standups in this date range.' : 'No standups yet.'}
                </p>
              </div>
            )
          ) : viewMode === 'mine' ? (
            <>
              {pastStandups.length > 0 && (
                <h3 className="heading-section mb-3">Past</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastStandups.map(s => renderStandupCard(s, false))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {groupedAllStandupsByDate.map(group => (
                <section key={group.date}>
                  <h3 className="heading-section mb-3">
                    {group.date === today ? 'Today' : formatDate(group.date)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map(s => renderStandupCard(s, group.date === today))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-3">
              <span className="text-xl">{formType === 'plan' ? '📋' : '✅'}</span>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {formType === 'plan'
                    ? editingStandup ? 'Edit Daily Plan' : 'Submit Daily Plan'
                    : editingStandup?.followup ? 'Edit Follow-up' : 'Submit Follow-up'
                  }
                </h3>
                <p className="text-xs text-muted/70 mt-0.5 text-foreground bg-elevated">
                  {editingStandup ? formatDate(editingStandup.standup_date) : formatDate(standupDate)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {formType === 'plan' && !editingStandup && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-muted mb-1.5">Date</label>
                  <input
                    type="date"
                    value={standupDate}
                    onChange={(e) => setStandupDate(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs font-medium text-muted mb-1.5 text-foreground bg-elevated">
                  {formType === 'plan' ? 'What do you plan to do today?' : 'How did it go?'}
                </label>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder={formType === 'plan' ? 'Write your plan for the day...' : 'Write your end-of-day follow-up...'}
                  rows={6}
                  autoFocus
                  className="block w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-elevated-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 resize-none leading-relaxed text-foreground bg-elevated"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:bg-elevated-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <><Spinner size="xs" className="-ml-1 mr-2" />Saving...</>
                  ) : formType === 'plan'
                    ? (editingStandup ? 'Update Plan' : 'Submit Plan')
                    : (editingStandup?.followup ? 'Update Follow-up' : 'Submit Follow-up')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && standups.length > 0 && (
        <div className="modal-overlay">
          <div className="card-flat p-6 text-center">
            <div className="flex justify-center"><Spinner size="md" /></div>
            <p className="mt-4 text-sm text-secondary font-medium">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}
