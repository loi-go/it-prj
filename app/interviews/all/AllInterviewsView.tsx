'use client'

import { useState, useEffect, useRef } from 'react'
import { getAllInterviews } from '../actions'
import ReactMarkdown from 'react-markdown'
import InterviewDateRangeFilter from '../InterviewDateRangeFilter'
import InterviewFilterSummary from '../InterviewFilterSummary'
import Spinner from '@/app/components/Spinner'
import {
  getDefaultInterviewDateRange,
  getInterviewDateRangeForPreset,
  matchInterviewDatePreset,
  type InterviewDatePreset,
} from '../utils'
import { copyToClipboard } from '@/lib/copyToClipboard'

type Interview = {
  id: string
  profile: string
  company: string
  step: string
  interview_date: string
  note: string | null
  state: 'Ongoing' | 'Rejected' | 'Offer' | 'None' | null
  interview_type: 'Remote' | 'Onsite' | 'Hybrid' | null
  image_url: string | null
  script: string | null
  ai_analysis: string | null
  created_at: string
  updated_at: string
  profiles: {
    name: string
  } | null
}

type GroupedInterview = {
  userName: string
  profile: string
  company: string
  interviews: Interview[]
  latestStatus: Interview['state']
}

type Props = {
  initialInterviews: Interview[]
}

// Helper function for compound sorting: interview_date desc, then updated_at desc
const sortInterviewsByDateAndUpdated = (a: Interview, b: Interview) => {
  const dateA = new Date(a.interview_date).getTime()
  const dateB = new Date(b.interview_date).getTime()
  
  // First, sort by interview_date (descending - newest first)
  if (dateA !== dateB) {
    return dateB - dateA
  }
  
  // If interview_date is the same, sort by updated_at (descending - most recently updated first)
  const updatedA = new Date(a.updated_at).getTime()
  const updatedB = new Date(b.updated_at).getTime()
  return updatedB - updatedA
}

export default function AllInterviewsView({ initialInterviews }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)
  const [scriptModalOpen, setScriptModalOpen] = useState(false)
  const [scriptModalInterview, setScriptModalInterview] = useState<Interview | null>(null)
  const [leftWidth, setLeftWidth] = useState(66.66) // 2/3 = 66.66%
  const [isDragging, setIsDragging] = useState(false)
  
  // Filter states
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set())
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const defaultDateRange = getDefaultInterviewDateRange()
  const [filterDateFrom, setFilterDateFrom] = useState(defaultDateRange.from || '')
  const [filterDateTo, setFilterDateTo] = useState(defaultDateRange.to || '')
  const [loadingInterviews, setLoadingInterviews] = useState(false)
  const skipInitialDateFetch = useRef(true)

  const applyDatePreset = (preset: InterviewDatePreset) => {
    const range = getInterviewDateRangeForPreset(preset)
    setFilterDateFrom(range.from || '')
    setFilterDateTo(range.to || '')
  }

  const resetFilters = () => {
    setSelectedUser('')
    setSelectedProfiles(new Set())
    setFilterCompany('')
    setFilterStatus('')
    applyDatePreset('2m')
  }

  useEffect(() => {
    if (skipInitialDateFetch.current) {
      skipInitialDateFetch.current = false
      return
    }

    const fetchInterviews = async () => {
      setLoadingInterviews(true)
      const result = await getAllInterviews({
        from: filterDateFrom || undefined,
        to: filterDateTo || undefined,
      })
      if (result.data) setInterviews(result.data)
      setLoadingInterviews(false)
    }

    fetchInterviews()
  }, [filterDateFrom, filterDateTo])

  // Extract unique user names
  const uniqueUserNames = Array.from(new Set(interviews.map(i => i.profiles?.name || 'Unknown'))).sort()
  
  // Extract profiles for the selected user
  const profilesForSelectedUser = selectedUser
    ? Array.from(new Set(
        interviews
          .filter(i => (i.profiles?.name || 'Unknown') === selectedUser)
          .map(i => i.profile)
      )).sort()
    : []

  const handleUserChange = (userName: string) => {
    setSelectedUser(userName)
    setSelectedProfiles(new Set()) // Clear profile selection when user changes
  }

  const toggleProfile = (profile: string) => {
    const newSelected = new Set(selectedProfiles)
    if (newSelected.has(profile)) {
      newSelected.delete(profile)
    } else {
      newSelected.add(profile)
    }
    setSelectedProfiles(newSelected)
  }

  // Apply filters
  let filteredInterviews = interviews

  // Filter by user
  if (selectedUser) {
    filteredInterviews = filteredInterviews.filter(interview => 
      (interview.profiles?.name || 'Unknown') === selectedUser
    )
  }

  // Filter by profile
  if (selectedProfiles.size > 0) {
    filteredInterviews = filteredInterviews.filter(interview => 
      selectedProfiles.has(interview.profile)
    )
  }

  // Filter by company
  if (filterCompany) {
    filteredInterviews = filteredInterviews.filter(interview => 
      interview.company.toLowerCase().includes(filterCompany.toLowerCase())
    )
  }

  // Filter by status - check latest interview per company group
  if (filterStatus) {
    const companyGroupsWithStatus = new Set<string>()
    const grouped = filteredInterviews.reduce((acc, interview) => {
      const userName = interview.profiles?.name || 'Unknown'
      const key = `${userName}-${interview.profile}-${interview.company}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(interview)
      return acc
    }, {} as Record<string, Interview[]>)

    Object.entries(grouped).forEach(([key, interviews]) => {
      const latest = interviews.sort(sortInterviewsByDateAndUpdated)[0]
      if (latest.state === filterStatus) {
        companyGroupsWithStatus.add(key)
      }
    })

    filteredInterviews = filteredInterviews.filter(interview => {
      const userName = interview.profiles?.name || 'Unknown'
      return companyGroupsWithStatus.has(`${userName}-${interview.profile}-${interview.company}`)
    })
  }

  // Filter by date range
  if (filterDateFrom) {
    filteredInterviews = filteredInterviews.filter(interview => 
      interview.interview_date >= filterDateFrom
    )
  }
  if (filterDateTo) {
    filteredInterviews = filteredInterviews.filter(interview => 
      interview.interview_date <= filterDateTo
    )
  }

  const isFilterActive = selectedUser || selectedProfiles.size > 0 || filterCompany || filterStatus ||
    matchInterviewDatePreset(filterDateFrom, filterDateTo) !== '2m'
  const activeDatePreset = matchInterviewDatePreset(filterDateFrom, filterDateTo)

  // Group interviews by userName + profile + company
  const groupedInterviews: GroupedInterview[] = filteredInterviews.reduce((acc, interview) => {
    const userName = interview.profiles?.name || 'Unknown'
    const key = `${userName}-${interview.profile}-${interview.company}`
    const existing = acc.find(g => `${g.userName}-${g.profile}-${g.company}` === key)
    
    if (existing) {
      existing.interviews.push(interview)
      const sortedInterviews = existing.interviews.sort(sortInterviewsByDateAndUpdated)
      existing.latestStatus = sortedInterviews[0].state
    } else {
      acc.push({
        userName,
        profile: interview.profile,
        company: interview.company,
        interviews: [interview],
        latestStatus: interview.state,
      })
    }
    
    return acc
  }, [] as GroupedInterview[])

  const toggleCard = (key: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedCards(newExpanded)
  }

  const getStateColor = (state: string | null) => {
    switch (state) {
      case 'Ongoing':
        return 'bg-blue-100 text-blue-800'
      case 'Offer':
        return 'bg-green-100 text-green-800'
      case 'Rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-elevated-muted text-muted'
    }
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleCopyScript = async (script: string, interviewId: string) => {
    const copied = await copyToClipboard(script)
    if (copied) {
      setCopiedScriptId(interviewId)
      setTimeout(() => setCopiedScriptId(null), 2000)
    } else {
      alert('Could not copy to clipboard. Please select the script and copy it manually.')
    }
  }

  const openScriptModal = (interview: Interview) => {
    setScriptModalInterview(interview)
    setScriptModalOpen(true)
  }

  const closeScriptModal = () => {
    setScriptModalOpen(false)
    setScriptModalInterview(null)
    setLeftWidth(66.66)
  }

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    
    const modal = e.currentTarget
    const rect = modal.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    
    // Limit between 30% and 80%
    if (percentage >= 30 && percentage <= 80) {
      setLeftWidth(percentage)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div>
      {/* Layout with Sidebar */}
      <div className="flex gap-6">
        {/* Sidebar - Filters */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-elevated rounded-lg shadow sticky top-6 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
            <div className="flex-shrink-0 p-4 border-b border-border-subtle space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Filters</h3>
                {isFilterActive && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-accent hover:text-accent-hover font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              <InterviewDateRangeFilter
                dateFrom={filterDateFrom}
                dateTo={filterDateTo}
                activePreset={activeDatePreset}
                onPresetSelect={applyDatePreset}
                onDateFromChange={setFilterDateFrom}
                onDateToChange={setFilterDateTo}
                loading={loadingInterviews}
              />

              <InterviewFilterSummary
                interviewCount={filteredInterviews.length}
                companyCount={groupedInterviews.length}
                totalInterviewCount={interviews.length}
                loading={loadingInterviews}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
              {/* User Selection - Radio Buttons */}
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  User
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded p-2">
                  {uniqueUserNames.length === 0 ? (
                    <span className="text-sm text-muted/70">No users yet</span>
                  ) : (
                    <>
                      <label className="flex items-center cursor-pointer hover:bg-elevated-muted p-1 rounded">
                        <input
                          type="radio"
                          name="userFilter"
                          checked={selectedUser === ''}
                          onChange={() => handleUserChange('')}
                          className="h-4 w-4 text-accent focus:ring-accent/20 border-border"
                        />
                        <span className="ml-2 text-sm text-secondary font-medium">All Users</span>
                      </label>
                      {uniqueUserNames.map(userName => (
                        <label key={userName} className="flex items-center cursor-pointer hover:bg-elevated-muted p-1 rounded">
                          <input
                            type="radio"
                            name="userFilter"
                            checked={selectedUser === userName}
                            onChange={() => handleUserChange(userName)}
                            className="h-4 w-4 text-accent focus:ring-accent/20 border-border"
                          />
                          <span className="ml-2 text-sm text-secondary">{userName}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Profile Checkboxes - Only show when user is selected */}
              {selectedUser && (
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-2">
                    Profile
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded p-2">
                    {profilesForSelectedUser.length === 0 ? (
                      <span className="text-sm text-muted/70">No profiles for this user</span>
                    ) : (
                      profilesForSelectedUser.map(profile => (
                        <label key={profile} className="flex items-center cursor-pointer hover:bg-elevated-muted p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedProfiles.has(profile)}
                            onChange={() => toggleProfile(profile)}
                            className="h-4 w-4 text-accent focus:ring-accent/20 border-border rounded"
                          />
                          <span className="ml-2 text-sm text-secondary">{profile}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Company Search */}
              <div>
                <label htmlFor="filterCompany" className="block text-sm font-semibold text-secondary mb-2">
                  Company
                </label>
                  <input
                    type="text"
                    id="filterCompany"
                    placeholder="Search..."
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-accent/20 text-foreground bg-elevated"
                  />
              </div>

              {/* Status Dropdown */}
              <div>
                <label htmlFor="filterStatus" className="block text-sm font-semibold text-secondary mb-2">
                  Status
                </label>
                  <select
                    id="filterStatus"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-accent/20 text-foreground bg-elevated"
                  >
                  <option value="">All</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                  <option value="None">No Status</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 relative">
          {loadingInterviews && (
            <div className="absolute inset-0 bg-elevated/75 flex items-center justify-center z-10 rounded-lg">
              <div className="text-center">
                <Spinner size="lg" className="mx-auto" />
                <p className="mt-3 text-sm font-medium text-secondary">Loading interviews...</p>
              </div>
            </div>
          )}

          {interviews.length === 0 ? (
            <div className="bg-elevated rounded-lg shadow p-8 text-center">
              <p className="text-muted">No interviews yet</p>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="bg-elevated rounded-lg shadow p-8 text-center">
              <p className="text-muted mb-4">No interviews match your filters</p>
              <button
                onClick={() => {
                  setSelectedUser('')
                  setSelectedProfiles(new Set())
                  setFilterCompany('')
                  setFilterStatus('')
                  setFilterDateFrom('')
                  setFilterDateTo('')
                }}
                className="text-accent hover:text-accent-hover font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedInterviews.map((group) => {
                const key = `${group.userName}-${group.profile}-${group.company}`
                const isExpanded = expandedCards.has(key)
                const sortedInterviews = [...group.interviews].sort(
                  (a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime()
                )

                return (
                  <div key={key} className="bg-elevated rounded-lg shadow-lg overflow-hidden border-2 border-border hover:border-accent/40 transition-all">
                    {/* Parent Card - Company Header */}
                    <div
                      className="p-6 cursor-pointer hover:bg-accent-subtle transition-all bg-gradient-to-r from-elevated to-elevated-muted"
                      onClick={() => toggleCard(key)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        {/* Left side - Company info and progress */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {/* Expand/Collapse Icon */}
                            <svg
                              className={`w-5 h-5 text-muted transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            
                            {/* Company Title with User Name - Single Line */}
                            <h3 className="text-xl font-bold text-foreground">
                              {group.userName} · {group.profile} · {group.company}
                            </h3>
                          </div>
                          
                          {/* Interview Steps Progress */}
                          <div className="flex items-center flex-wrap gap-2 text-sm text-muted ml-7">
                            {sortedInterviews.map((interview, idx) => (
                              <span key={interview.id} className="flex items-center">
                                <span className="font-semibold text-secondary">{interview.step}</span>
                                <span className="text-xs text-muted ml-1">({formatDate(interview.interview_date)})</span>
                                {idx < sortedInterviews.length - 1 && (
                                  <span className="mx-2 text-accent/60 font-bold">→</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Right side - Status Badge */}
                        <div
                          className={`px-4 py-2 inline-flex text-sm font-bold rounded-lg ${getStateColor(group.latestStatus)} shadow-sm`}
                        >
                          {group.latestStatus}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Child Cards - Individual Interviews */}
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden min-h-0">
                        <div
                          className={`border-t-4 border-accent/30 bg-gradient-to-b from-elevated-muted to-elevated-muted/80 transition-all duration-300 ease-out ${
                            isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                          }`}
                        >
                        <div className="px-6 py-3 bg-accent-subtle border-b border-accent/20">
                          <p className="text-xs font-semibold text-accent-hover uppercase tracking-wide">Interview Details</p>
                        </div>
                        
                        {sortedInterviews.map((interview, idx) => (
                          <div 
                            key={interview.id} 
                            className={`mx-4 my-3 bg-elevated rounded-lg shadow-sm border border-border p-4 ${
                              isExpanded ? 'animate-expand-item-in' : ''
                            }`}
                            style={isExpanded ? { animationDelay: `${idx * 60}ms` } : undefined}
                          >
                            {/* Interview Header - Single Line */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-8 h-8 bg-accent-muted rounded-full flex items-center justify-center text-accent-hover font-bold text-sm flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <h4 className="font-bold text-foreground text-base">{interview.step}</h4>
                              </div>
                              
                              {/* Date */}
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted">
                                  📅 {formatDate(interview.interview_date)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Interview Note */}
                            {interview.note && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-muted mb-1">Note:</p>
                                <p className="text-sm text-secondary bg-elevated-muted p-3 rounded-lg border-l-4 border-accent/40 whitespace-pre-wrap">
                                  {interview.note}
                                </p>
                              </div>
                            )}
                            
                            {/* Interview Image */}
                            {interview.image_url && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-muted mb-1">Attached Image:</p>
                                <div className="flex justify-center">
                                  <img 
                                    src={interview.image_url} 
                                    alt="Interview attachment"
                                    className="max-w-xs h-32 object-contain bg-elevated-muted rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setZoomImageUrl(interview.image_url)}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Interview Script */}
                            {interview.script && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold text-muted">Interview Script:</p>
                                  <button
                                    onClick={() => openScriptModal(interview)}
                                    className="text-xs px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded transition-colors font-medium"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomImageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
          onClick={() => setZoomImageUrl(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setZoomImageUrl(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={zoomImageUrl} 
              alt="Zoomed view" 
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Script Analysis Modal */}
      {scriptModalOpen && scriptModalInterview?.script && (
        <div className="modal-overlay">
          <div 
            className="modal-panel max-w-7xl h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Interview Script Analysis</h3>
              <button
                type="button"
                onClick={closeScriptModal}
                className="text-muted/70 hover:text-muted transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
              <div className="flex flex-col overflow-hidden" style={{ width: `${leftWidth}%` }}>
                <div className="flex justify-between items-center px-6 py-3 border-b border-border bg-elevated-muted">
                  <h4 className="text-sm font-semibold text-secondary">Interview Script</h4>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleCopyScript(scriptModalInterview.script!, 'modal')
                    }}
                    className="text-xs px-3 py-1 bg-accent-subtle text-accent hover:bg-accent-muted rounded transition-colors flex items-center gap-1"
                  >
                    {copiedScriptId === 'modal' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <pre className="text-sm text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                    {scriptModalInterview.script}
                  </pre>
                </div>
              </div>

              <div
                className="w-1 bg-border hover:bg-accent/40 cursor-col-resize transition-colors flex-shrink-0 relative group"
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
                  <div className="w-1 h-12 bg-muted/50 group-hover:bg-accent rounded-full transition-colors" />
                </div>
              </div>

              <div className="flex flex-col overflow-hidden" style={{ width: `${100 - leftWidth}%` }}>
                <div className="px-4 py-3 border-b border-border bg-elevated-muted">
                  <h4 className="text-sm font-semibold text-secondary">AI Analysis</h4>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-elevated-muted">
                  {scriptModalInterview.ai_analysis ? (
                    <div className="text-sm text-secondary prose prose-sm max-w-none">
                      <ReactMarkdown>{scriptModalInterview.ai_analysis}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center text-muted text-sm mt-8">
                      <p className="mb-2">No saved analysis yet.</p>
                      <p className="text-xs text-muted/70">
                        Analysis appears here after the interview owner saves a script.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

