'use client'

import { useState } from 'react'
import { createInterview, updateInterview, deleteInterview } from './actions'

type Interview = {
  id: string
  profile: string
  company: string
  step: string
  interview_date: string
  note: string | null
  state: 'Ongoing' | 'Rejected' | 'Offer'
  interview_type: 'Remote' | 'Onsite' | 'Hybrid' | null
}

type GroupedInterview = {
  profile: string
  company: string
  interviews: Interview[]
  latestStatus: 'Ongoing' | 'Rejected' | 'Offer'
}

type Props = {
  initialInterviews: Interview[]
}

export default function InterviewsTable({ initialInterviews }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusChangeInterview, setStatusChangeInterview] = useState<Interview | null>(null)
  
  // Filter states
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set())
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Extract unique profiles
  const uniqueProfiles = Array.from(new Set(interviews.map(i => i.profile))).sort()

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
    // Group by profile-company and find latest status
    const companyGroupsWithStatus = new Set<string>()
    const grouped = filteredInterviews.reduce((acc, interview) => {
      const key = `${interview.profile}-${interview.company}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(interview)
      return acc
    }, {} as Record<string, Interview[]>)

    // Check which groups have the matching status in their latest interview
    Object.entries(grouped).forEach(([key, interviews]) => {
      const latest = interviews.sort(
        (a, b) => new Date(b.interview_date).getTime() - new Date(a.interview_date).getTime()
      )[0]
      if (latest.state === filterStatus) {
        companyGroupsWithStatus.add(key)
      }
    })

    // Filter to only include interviews from groups with matching status
    filteredInterviews = filteredInterviews.filter(interview => 
      companyGroupsWithStatus.has(`${interview.profile}-${interview.company}`)
    )
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

  // Always use grouped card view
  const isTableView = false
  const isFilterActive = selectedProfiles.size > 0 || filterCompany || filterStatus || filterDateFrom || filterDateTo

  // Group interviews by profile + company (for card view)
  const groupedInterviews: GroupedInterview[] = filteredInterviews.reduce((acc, interview) => {
    const key = `${interview.profile}-${interview.company}`
    const existing = acc.find(g => `${g.profile}-${g.company}` === key)
    
    if (existing) {
      existing.interviews.push(interview)
      // Update latest status (most recent interview)
      const sortedInterviews = existing.interviews.sort(
        (a, b) => new Date(b.interview_date).getTime() - new Date(a.interview_date).getTime()
      )
      existing.latestStatus = sortedInterviews[0].state
    } else {
      acc.push({
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

  const openCreateModal = () => {
    setEditingInterview(null)
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (interview: Interview) => {
    setEditingInterview(interview)
    setError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingInterview(null)
    setError(null)
  }

  const openStatusModal = (interview: Interview) => {
    setStatusChangeInterview(interview)
    setStatusModalOpen(true)
  }

  const closeStatusModal = () => {
    setStatusModalOpen(false)
    setStatusChangeInterview(null)
  }

  const handleStatusChange = async (newStatus: 'Ongoing' | 'Rejected' | 'Offer') => {
    if (!statusChangeInterview) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('profile', statusChangeInterview.profile)
    formData.append('company', statusChangeInterview.company)
    formData.append('step', statusChangeInterview.step)
    formData.append('interview_date', statusChangeInterview.interview_date)
    formData.append('note', statusChangeInterview.note || '')
    formData.append('state', newStatus)
    formData.append('interview_type', statusChangeInterview.interview_type || 'Remote')

    const result = await updateInterview(statusChangeInterview.id, formData)

    if (result.error) {
      alert('Error: ' + result.error)
      setLoading(false)
    } else if (result.data) {
      // Update only the specific interview in local state
      setInterviews(prev => prev.map(interview => 
        interview.id === statusChangeInterview.id ? result.data : interview
      ))
      setLoading(false)
      closeStatusModal()
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Set default values
    if (editingInterview) {
      formData.append('state', editingInterview.state)
      formData.append('interview_type', editingInterview.interview_type || 'Remote')
    } else {
      formData.append('state', 'Ongoing')
      formData.append('interview_type', 'Remote')
    }

    let result
    if (editingInterview) {
      result = await updateInterview(editingInterview.id, formData)
    } else {
      result = await createInterview(formData)
    }

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.data) {
      // Update local state directly without re-fetching
      if (editingInterview) {
        // Update existing interview
        setInterviews(prev => prev.map(interview => 
          interview.id === editingInterview.id ? result.data : interview
        ))
      } else {
        // Add new interview to the beginning
        setInterviews(prev => [result.data, ...prev])
      }
      setLoading(false)
      closeModal()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interview?')) {
      return
    }

    setLoading(true)
    const result = await deleteInterview(id)

    if (result.error) {
      alert('Error: ' + result.error)
      setLoading(false)
    } else {
      // Remove from local state
      setInterviews(prev => prev.filter(interview => interview.id !== id))
      setLoading(false)
    }
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
    // Parse date as local time to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Interviews</h2>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + Add Interview
        </button>
      </div>

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
              {/* Profile Checkboxes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Profile
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                  {uniqueProfiles.length === 0 ? (
                    <span className="text-sm text-gray-400">No profiles yet</span>
                  ) : (
                    uniqueProfiles.map(profile => (
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
          <p className="text-gray-500 mb-4">No interviews yet</p>
          <button
            onClick={openCreateModal}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Add your first interview
          </button>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No interviews match your filters</p>
          <button
            onClick={() => {
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
      ) : isTableView ? (
        // Table View for Date Filter
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Step
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {interview.profile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {interview.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {interview.step}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(interview.interview_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openStatusModal(interview)}
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateColor(interview.state)} hover:opacity-80 transition-opacity`}
                      >
                        {interview.state}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(interview)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(interview.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Grouped Card View
        <div className="space-y-4">
          {groupedInterviews.map((group) => {
            const key = `${group.profile}-${group.company}`
            const isExpanded = expandedCards.has(key)
            const sortedInterviews = [...group.interviews].sort(
              (a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime()
            )
            const latestInterview = [...group.interviews].sort(
              (a, b) => new Date(b.interview_date).getTime() - new Date(a.interview_date).getTime()
            )[0]

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
                      <div className="flex items-center gap-2 mb-3">
                        {/* Expand/Collapse Icon */}
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        
                        {/* Company Title */}
                        <h3 className="text-xl font-bold text-gray-900">
                          {group.profile} · {group.company}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openStatusModal(latestInterview)
                      }}
                      className={`px-4 py-2 inline-flex text-sm font-bold rounded-lg ${getStateColor(group.latestStatus)} hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 transition-all shadow-sm`}
                    >
                      {group.latestStatus}
                    </button>
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
                        className="mx-4 my-3 bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                      >
                        {/* Interview Header - Single Line */}
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                              {idx + 1}
                            </div>
                            <h4 className="font-bold text-gray-900 text-base">{interview.step}</h4>
                          </div>
                          
                          {/* Date and Action Buttons */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">
                              📅 {formatDate(interview.interview_date)}
                            </span>
                            <button
                              onClick={() => openEditModal(interview)}
                              className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(interview.id)}
                              className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                              disabled={loading}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                        
                        {/* Interview Note */}
                        {interview.note && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Note:</p>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingInterview ? 'Edit Interview' : 'Add Interview'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="profile" className="block text-sm font-medium text-gray-700">
                    Profile *
                  </label>
                  <input
                    type="text"
                    name="profile"
                    id="profile"
                    required
                    placeholder="e.g., david, matthew"
                    defaultValue={editingInterview?.profile}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                    Company *
                  </label>
                  <input
                    type="text"
                    name="company"
                    id="company"
                    required
                    defaultValue={editingInterview?.company}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="step" className="block text-sm font-medium text-gray-700">
                    Interview Step *
                  </label>
                  <input
                    type="text"
                    name="step"
                    id="step"
                    required
                    placeholder="e.g., Phone Screen, Technical, Final"
                    defaultValue={editingInterview?.step}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="interview_date" className="block text-sm font-medium text-gray-700">
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    name="interview_date"
                    id="interview_date"
                    required
                    defaultValue={editingInterview?.interview_date || new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="note"
                    id="note"
                    rows={3}
                    defaultValue={editingInterview?.note || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingInterview ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {statusModalOpen && statusChangeInterview && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Change Status
              </h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Update status for: <strong>{statusChangeInterview.step}</strong> at <strong>{statusChangeInterview.company}</strong>
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleStatusChange('Ongoing')}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    statusChangeInterview.state === 'Ongoing'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-gray-900">Ongoing</span>
                </button>

                <button
                  onClick={() => handleStatusChange('Offer')}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    statusChangeInterview.state === 'Offer'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-gray-900">Offer</span>
                </button>

                <button
                  onClick={() => handleStatusChange('Rejected')}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    statusChangeInterview.state === 'Rejected'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-gray-900">Rejected</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeStatusModal}
                disabled={loading}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-700 font-medium">Processing...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

