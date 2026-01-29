'use client'

import { useState } from 'react'

type Interview = {
  id: string
  profile: string
  company: string
  step: string
  interview_date: string
  note: string | null
  state: 'Ongoing' | 'Rejected' | 'Offer'
  interview_type: 'Remote' | 'Onsite' | 'Hybrid' | null
  image_url: string | null
  script: string | null
  profiles: {
    name: string
  } | null
}

type GroupedInterview = {
  userName: string
  profile: string
  company: string
  interviews: Interview[]
  latestStatus: 'Ongoing' | 'Rejected' | 'Offer'
}

type Props = {
  initialInterviews: Interview[]
}

export default function AllInterviewsView({ initialInterviews }: Props) {
  const [interviews] = useState<Interview[]>(initialInterviews)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)
  
  // Filter states
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set())
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

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
      const latest = interviews.sort(
        (a, b) => new Date(b.interview_date).getTime() - new Date(a.interview_date).getTime()
      )[0]
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

  const isFilterActive = selectedUser || selectedProfiles.size > 0 || filterCompany || filterStatus || filterDateFrom || filterDateTo

  // Group interviews by userName + profile + company
  const groupedInterviews: GroupedInterview[] = filteredInterviews.reduce((acc, interview) => {
    const userName = interview.profiles?.name || 'Unknown'
    const key = `${userName}-${interview.profile}-${interview.company}`
    const existing = acc.find(g => `${g.userName}-${g.profile}-${g.company}` === key)
    
    if (existing) {
      existing.interviews.push(interview)
      const sortedInterviews = existing.interviews.sort(
        (a, b) => new Date(b.interview_date).getTime() - new Date(a.interview_date).getTime()
      )
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

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Ongoing':
        return 'bg-blue-100 text-blue-800'
      case 'Offer':
        return 'bg-green-100 text-green-800'
      case 'Rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleCopyScript = async (script: string, interviewId: string) => {
    try {
      await navigator.clipboard.writeText(script)
      setCopiedScriptId(interviewId)
      setTimeout(() => setCopiedScriptId(null), 2000)
    } catch (err) {
      console.error('Failed to copy script:', err)
    }
  }

  return (
    <div>
      {/* Layout with Sidebar */}
      <div className="flex gap-6">
        {/* Sidebar - Filters */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4 sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              {isFilterActive && (
                <button
                  onClick={() => {
                    setSelectedUser('')
                    setSelectedProfiles(new Set())
                    setFilterCompany('')
                    setFilterStatus('')
                    setFilterDateFrom('')
                    setFilterDateTo('')
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* User Selection - Radio Buttons */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  User
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2">
                  {uniqueUserNames.length === 0 ? (
                    <span className="text-sm text-gray-400">No users yet</span>
                  ) : (
                    <>
                      <label className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="radio"
                          name="userFilter"
                          checked={selectedUser === ''}
                          onChange={() => handleUserChange('')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 font-medium">All Users</span>
                      </label>
                      {uniqueUserNames.map(userName => (
                        <label key={userName} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="radio"
                            name="userFilter"
                            checked={selectedUser === userName}
                            onChange={() => handleUserChange(userName)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">{userName}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Profile Checkboxes - Only show when user is selected */}
              {selectedUser && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Profile
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                    {profilesForSelectedUser.length === 0 ? (
                      <span className="text-sm text-gray-400">No profiles for this user</span>
                    ) : (
                      profilesForSelectedUser.map(profile => (
                        <label key={profile} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedProfiles.has(profile)}
                            onChange={() => toggleProfile(profile)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{profile}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Company Search */}
              <div>
                <label htmlFor="filterCompany" className="block text-sm font-semibold text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  id="filterCompany"
                  placeholder="Search..."
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              {/* Status Dropdown */}
              <div>
                <label htmlFor="filterStatus" className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="">All</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    placeholder="From"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                  <input
                    type="date"
                    placeholder="To"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Results Count */}
              {isFilterActive && (
                <div className="pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600 font-medium">
                    {filteredInterviews.length} result(s)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {interviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No interviews yet</p>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">No interviews match your filters</p>
              <button
                onClick={() => {
                  setSelectedUser('')
                  setSelectedProfiles(new Set())
                  setFilterCompany('')
                  setFilterStatus('')
                  setFilterDateFrom('')
                  setFilterDateTo('')
                }}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
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
                  <div key={key} className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200 hover:border-indigo-300 transition-all">
                    {/* Parent Card - Company Header */}
                    <div
                      className="p-6 cursor-pointer hover:bg-indigo-50 transition-all bg-gradient-to-r from-white to-gray-50"
                      onClick={() => toggleCard(key)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        {/* Left side - Company info and progress */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {/* Expand/Collapse Icon */}
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            
                            {/* Company Title with User Name - Single Line */}
                            <h3 className="text-xl font-bold text-gray-900">
                              {group.userName} · {group.profile} · {group.company}
                            </h3>
                          </div>
                          
                          {/* Interview Steps Progress */}
                          <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600 ml-7">
                            {sortedInterviews.map((interview, idx) => (
                              <span key={interview.id} className="flex items-center">
                                <span className="font-semibold text-gray-700">{interview.step}</span>
                                <span className="text-xs text-gray-500 ml-1">({formatDate(interview.interview_date)})</span>
                                {idx < sortedInterviews.length - 1 && (
                                  <span className="mx-2 text-indigo-400 font-bold">→</span>
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
                    {isExpanded && (
                      <div className="border-t-4 border-indigo-200 bg-gradient-to-b from-gray-50 to-gray-100">
                        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100">
                          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Interview Details</p>
                        </div>
                        
                        {sortedInterviews.map((interview, idx) => (
                          <div 
                            key={interview.id} 
                            className="mx-4 my-3 bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                          >
                            {/* Interview Header - Single Line */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <h4 className="font-bold text-gray-900 text-base">{interview.step}</h4>
                              </div>
                              
                              {/* Date */}
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  📅 {formatDate(interview.interview_date)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Interview Image */}
                            {interview.image_url && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Attached Image:</p>
                                <div className="flex justify-center">
                                  <img 
                                    src={interview.image_url} 
                                    alt="Interview attachment"
                                    className="max-w-xs h-32 object-contain bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setZoomImageUrl(interview.image_url)}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Interview Script */}
                            {interview.script && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-semibold text-gray-500">Interview Script:</p>
                                  <button
                                    onClick={() => handleCopyScript(interview.script!, interview.id)}
                                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors flex items-center gap-1"
                                  >
                                    {copiedScriptId === interview.id ? (
                                      <>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border-l-4 border-green-300 whitespace-pre-wrap font-sans overflow-y-auto max-h-32">
                                  {interview.script}
                                </pre>
                              </div>
                            )}
                            
                            {/* Interview Note */}
                            {interview.note && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Additional Note:</p>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-300">
                                  {interview.note}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
    </div>
  )
}

