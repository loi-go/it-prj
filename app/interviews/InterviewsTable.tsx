'use client'

import { useState, useEffect, useRef } from 'react'
import { createInterview, updateInterview, deleteInterview, getInterviews, regenerateInterviewAnalysis } from './actions'
import ReactMarkdown from 'react-markdown'
import InterviewDateRangeFilter from './InterviewDateRangeFilter'
import InterviewFilterSummary from './InterviewFilterSummary'
import Spinner from '@/app/components/Spinner'
import {
  getDefaultInterviewDateRange,
  getInterviewDateRangeForPreset,
  matchInterviewDatePreset,
  type InterviewDatePreset,
} from './utils'
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
}

type GroupedInterview = {
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

export default function InterviewsTable({ initialInterviews }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusChangeInterview, setStatusChangeInterview] = useState<Interview | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [deleteExistingImage, setDeleteExistingImage] = useState(false)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)
  const [scriptModalOpen, setScriptModalOpen] = useState(false)
  const [scriptModalInterview, setScriptModalInterview] = useState<Interview | null>(null)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [leftWidth, setLeftWidth] = useState(66.66) // 2/3 = 66.66%
  const [isDragging, setIsDragging] = useState(false)
  
  // Filter states
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
      const result = await getInterviews({
        from: filterDateFrom || undefined,
        to: filterDateTo || undefined,
      })
      if (result.data) setInterviews(result.data)
      setLoadingInterviews(false)
    }

    fetchInterviews()
  }, [filterDateFrom, filterDateTo])

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
      const latest = interviews.sort(sortInterviewsByDateAndUpdated)[0]
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
  const isFilterActive = selectedProfiles.size > 0 || filterCompany || filterStatus ||
    matchInterviewDatePreset(filterDateFrom, filterDateTo) !== '2m'
  const activeDatePreset = matchInterviewDatePreset(filterDateFrom, filterDateTo)

  // Group interviews by profile + company (for card view)
  const groupedInterviews: GroupedInterview[] = filteredInterviews.reduce((acc, interview) => {
    const key = `${interview.profile}-${interview.company}`
    const existing = acc.find(g => `${g.profile}-${g.company}` === key)
    
    if (existing) {
      existing.interviews.push(interview)
      // Update latest status (most recent interview)
      const sortedInterviews = existing.interviews.sort(sortInterviewsByDateAndUpdated)
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
    setSelectedImage(null)
    setImagePreview(null)
    setDeleteExistingImage(false)
    setIsModalOpen(true)
  }

  const openEditModal = (interview: Interview) => {
    setEditingInterview(interview)
    setError(null)
    setSelectedImage(null)
    setImagePreview(interview.image_url)
    setDeleteExistingImage(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingInterview(null)
    setError(null)
    setSelectedImage(null)
    setImagePreview(null)
    setDeleteExistingImage(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      setSelectedImage(file)
      setDeleteExistingImage(false)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setDeleteExistingImage(true)
    // Reset file input
    const fileInput = document.getElementById('image-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
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
    setReanalyzing(false)
    setLeftWidth(66.66)
  }

  const handleReanalyze = async () => {
    if (!scriptModalInterview) return

    setReanalyzing(true)
    const result = await regenerateInterviewAnalysis(scriptModalInterview.id)
    setReanalyzing(false)

    if ('error' in result && result.error) {
      alert(`Error: ${result.error}`)
      return
    }

    if ('data' in result && result.data) {
      const updated = result.data as Interview
      setScriptModalInterview(updated)
      setInterviews((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    }
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

  const openStatusModal = (interview: Interview) => {
    setStatusChangeInterview(interview)
    setStatusModalOpen(true)
  }

  const closeStatusModal = () => {
    setStatusModalOpen(false)
    setStatusChangeInterview(null)
  }

  const handleStatusChange = async (newStatus: 'Ongoing' | 'Rejected' | 'Offer' | 'None') => {
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

    // Add image if selected
    if (selectedImage) {
      formData.append('image', selectedImage)
    }

    // Add delete image flag
    if (deleteExistingImage) {
      formData.append('deleteImage', 'true')
    }

    // Set default values
    if (editingInterview) {
      formData.append('state', editingInterview.state || 'Ongoing')
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
      if ('analysisWarning' in result && result.analysisWarning) {
        alert(`Interview saved, but AI analysis failed: ${result.analysisWarning}`)
      }
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
    // Parse date as local time to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">My Interviews</h2>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/20"
        >
          + Add Interview
        </button>
      </div>

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
              {/* Profile Checkboxes */}
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Profile
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded p-2">
                  {uniqueProfiles.length === 0 ? (
                    <span className="text-sm text-muted/70">No profiles yet</span>
                  ) : (
                    uniqueProfiles.map(profile => (
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
          <p className="text-muted mb-4">No interviews yet</p>
          <button
            onClick={openCreateModal}
            className="text-accent hover:text-accent-hover font-medium"
          >
            Add your first interview
          </button>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-elevated rounded-lg shadow p-8 text-center">
          <p className="text-muted mb-4">No interviews match your filters</p>
          <button
            onClick={() => {
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
      ) : isTableView ? (
        // Table View for Date Filter
        <div className="bg-elevated shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-elevated-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Profile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Step
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-elevated divide-y divide-gray-200">
                {filteredInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-elevated-muted">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {interview.profile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                      {interview.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                      {interview.step}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
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
                        className="text-accent hover:text-accent-hover mr-4"
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
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            const latestInterview = [...group.interviews].sort(sortInterviewsByDateAndUpdated)[0]

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
                      <div className="flex items-center gap-2 mb-3">
                        {/* Expand/Collapse Icon */}
                        <svg
                          className={`w-5 h-5 text-muted transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        
                        {/* Company Title */}
                        <h3 className="text-xl font-bold text-foreground">
                          {group.profile} · {group.company}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openStatusModal(latestInterview)
                      }}
                      className={`px-4 py-2 inline-flex text-sm font-bold rounded-lg ${getStateColor(group.latestStatus)} hover:ring-2 hover:ring-offset-2 hover:ring-accent/30 transition-all shadow-sm`}
                    >
                      {group.latestStatus}
                    </button>
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
                        className={`mx-4 my-3 bg-elevated rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow ${
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
                          
                          {/* Date and Action Buttons */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted">
                              📅 {formatDate(interview.interview_date)}
                            </span>
                            <button
                              onClick={() => openEditModal(interview)}
                              className="px-3 py-1 text-xs font-medium text-accent bg-accent-subtle hover:bg-accent-muted rounded-md transition-colors"
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
                            <p className="text-xs font-semibold text-muted mb-1">Note:</p>
                            <p className="text-sm text-secondary bg-elevated-muted p-3 rounded-lg border border-border whitespace-pre-wrap">
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

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">
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
                  <label htmlFor="profile" className="block text-sm font-medium text-secondary">
                    Profile *
                  </label>
                  <input
                    type="text"
                    name="profile"
                    id="profile"
                    required
                    placeholder="e.g., david, matthew"
                    defaultValue={editingInterview?.profile}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent/20 sm:text-sm text-foreground bg-elevated"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-secondary">
                    Company *
                  </label>
                  <input
                    type="text"
                    name="company"
                    id="company"
                    required
                    placeholder="e.g., Google, Apple, Facebook"
                    defaultValue={editingInterview?.company}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent/20 sm:text-sm text-foreground bg-elevated"
                  />
                </div>

                <div>
                  <label htmlFor="step" className="block text-sm font-medium text-secondary">
                    Interview Step *
                  </label>
                  <input
                    type="text"
                    name="step"
                    id="step"
                    required
                    placeholder="e.g., Phone Screen, Technical, Final"
                    defaultValue={editingInterview?.step}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent/20 sm:text-sm text-foreground bg-elevated"
                  />
                </div>

                <div>
                  <label htmlFor="interview_date" className="block text-sm font-medium text-secondary">
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    name="interview_date"
                    id="interview_date"
                    required
                    defaultValue={editingInterview?.interview_date || new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent/20 sm:text-sm text-foreground bg-elevated"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="note" className="block text-sm font-medium text-secondary">
                    Note (Optional)
                  </label>
                  <textarea
                    name="note"
                    id="note"
                    rows={3}
                    defaultValue={editingInterview?.note || ''}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent/20 sm:text-sm text-foreground bg-elevated"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="script" className="block text-sm font-medium text-secondary">
                    Interview Script (Optional)
                  </label>
                  <p className="mt-1 mb-2 text-xs text-muted">
                    If provided, Claude will analyze the script and save structured interview details automatically.
                  </p>
                  <textarea
                    name="script"
                    id="script"
                    rows={6}
                    defaultValue={editingInterview?.script || ''}
                    className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent/20 sm:text-sm font-mono text-xs text-foreground bg-elevated"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Attach Image (Optional)
                  </label>
                  
                  {/* Image Preview or Upload Button */}
                  {imagePreview ? (
                    <div className="space-y-2">
                      <div className="relative border-2 border-border rounded-lg p-2 bg-elevated-muted">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-w-full h-48 object-contain mx-auto"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="image-upload"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-border shadow-sm text-sm font-medium rounded-md text-secondary bg-elevated-muted hover:bg-border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/20"
                      >
                        📎 Attach Image
                      </label>
                      <p className="mt-1 text-xs text-muted">
                        Supported formats: JPG, PNG, GIF (Max size: 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-border bg-elevated px-4 py-2 text-sm font-medium text-secondary shadow-sm hover:bg-elevated-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 disabled:opacity-50"
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
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">
                Change Status
              </h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-muted mb-4">
                Update status for: <strong>{statusChangeInterview.step}</strong> at <strong>{statusChangeInterview.company}</strong>
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleStatusChange('Ongoing')}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    statusChangeInterview.state === 'Ongoing'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-border hover:border-blue-300'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-foreground">Ongoing</span>
                </button>

                <button
                  onClick={() => handleStatusChange('Offer')}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    statusChangeInterview.state === 'Offer'
                      ? 'border-green-500 bg-green-50'
                      : 'border-border hover:border-green-300'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-foreground">Offer</span>
                </button>

                <button
                  onClick={() => handleStatusChange('Rejected')}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    statusChangeInterview.state === 'Rejected'
                      ? 'border-red-500 bg-red-50'
                      : 'border-border hover:border-red-300'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-foreground">Rejected</span>
                </button>

                <button
                  onClick={() => handleStatusChange('None')}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    !statusChangeInterview.state || statusChangeInterview.state === 'None'
                      ? 'border-border bg-elevated-muted'
                      : 'border-border hover:border-gray-400'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-foreground">No Status</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button
                onClick={closeStatusModal}
                disabled={loading}
                className="inline-flex justify-center rounded-md border border-border bg-elevated px-4 py-2 text-sm font-medium text-secondary shadow-sm hover:bg-elevated-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner Overlay */}
      {loading && (
        <div className="modal-overlay">
          <div className="card-flat p-6">
            <div className="flex flex-col items-center">
              <Spinner size="lg" />
              <p className="mt-4 text-sm text-secondary font-medium">Processing...</p>
            </div>
          </div>
        </div>
      )}

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
                <div className="px-4 py-3 border-b border-border bg-elevated-muted flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-secondary">AI Analysis</h4>
                  <button
                    type="button"
                    onClick={() => void handleReanalyze()}
                    disabled={reanalyzing}
                    className="btn-secondary !py-1.5 !px-3 text-xs"
                  >
                    {reanalyzing ? (
                      <>
                        <Spinner size="xs" />
                        Analyzing...
                      </>
                    ) : (
                      'Re-analyze'
                    )}
                  </button>
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
                        Analysis is generated automatically when you save an interview with a script.
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

