'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Interview = {
  id: string
  user_id: string
  profile: string
  company: string
  step: string
  interview_date: string
  note: string | null
  state: 'Ongoing' | 'Rejected' | 'Offer'
  interview_type: 'Remote' | 'Onsite' | 'Hybrid' | null
  image_url: string | null
  script: string | null
  created_at: string
  updated_at: string
}

type Profile = {
  id: string
  name: string
}

type Props = {
  interviews: Interview[]
  profiles: Profile[]
}

type UserAnalytics = {
  userId: string
  userName: string
  totalInterviews: number
  totalCompanies: number
  firstInterviewPassRate: number
}

export default function AllUsersAnalyticsView({ interviews, profiles }: Props) {
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  
  // Chart controls - separate for weekly and monthly
  const [weeklySelectedUsers, setWeeklySelectedUsers] = useState<Set<string>>(new Set())
  const [weeklySelectedMetrics, setWeeklySelectedMetrics] = useState<Set<string>>(new Set(['interviews']))
  const [monthlySelectedUsers, setMonthlySelectedUsers] = useState<Set<string>>(new Set())
  const [monthlySelectedMetrics, setMonthlySelectedMetrics] = useState<Set<string>>(new Set(['interviews']))
  
  // Date range controls
  const [weeklyDateRange, setWeeklyDateRange] = useState({ weeks: 12 })
  const [monthlyDateRange, setMonthlyDateRange] = useState({ months: 6 })

  const availableMetrics = [
    { key: 'interviews', label: 'Interview Count' },
    { key: 'firstInterviewPassRate', label: 'First Interview Pass Rate (%)' },
    { key: 'firstInterviewCount', label: 'First Interview Count' },
    { key: 'nextStepCount', label: 'Next Step Count' },
    { key: 'offerCount', label: 'Offer Count' }
  ]

  const userColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange-600
    '#EC4899', // Pink
    '#6366F1', // Indigo
  ]

  const metricColors = [
    '#3B82F6', // Blue - Interview Count
    '#10B981', // Green - First Interview Pass Rate
    '#8B5CF6', // Purple - First Interview Count
    '#F59E0B', // Orange - Next Step Count
    '#EF4444', // Red - Offer Count
  ]

  const getUserColor = (userId: string) => {
    const userIndex = userAnalytics.findIndex(u => u.userId === userId)
    return userColors[userIndex % userColors.length]
  }

  const getMetricColor = (metricKey: string) => {
    const metricIndex = availableMetrics.findIndex(m => m.key === metricKey)
    return metricColors[metricIndex % metricColors.length]
  }

  const toggleWeeklyUser = (userId: string) => {
    const newSelected = new Set(weeklySelectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    
    // When switching from single user to multiple users, limit to one metric
    if (weeklySelectedUsers.size === 1 && newSelected.size >= 2) {
      const firstMetric = Array.from(weeklySelectedMetrics)[0]
      setWeeklySelectedMetrics(new Set([firstMetric]))
    }
    
    setWeeklySelectedUsers(newSelected)
  }

  const toggleWeeklyMetric = (metricKey: string) => {
    const isMultipleUsers = weeklySelectedUsers.size >= 2
    
    if (isMultipleUsers) {
      setWeeklySelectedMetrics(new Set([metricKey]))
    } else {
      const newSelected = new Set(weeklySelectedMetrics)
      if (newSelected.has(metricKey)) {
        if (newSelected.size > 1) {
          newSelected.delete(metricKey)
        }
      } else {
        newSelected.add(metricKey)
      }
      setWeeklySelectedMetrics(newSelected)
    }
  }

  const toggleMonthlyUser = (userId: string) => {
    const newSelected = new Set(monthlySelectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    
    // When switching from single user to multiple users, limit to one metric
    if (monthlySelectedUsers.size === 1 && newSelected.size >= 2) {
      const firstMetric = Array.from(monthlySelectedMetrics)[0]
      setMonthlySelectedMetrics(new Set([firstMetric]))
    }
    
    setMonthlySelectedUsers(newSelected)
  }

  const toggleMonthlyMetric = (metricKey: string) => {
    const isMultipleUsers = monthlySelectedUsers.size >= 2
    
    if (isMultipleUsers) {
      setMonthlySelectedMetrics(new Set([metricKey]))
    } else {
      const newSelected = new Set(monthlySelectedMetrics)
      if (newSelected.has(metricKey)) {
        if (newSelected.size > 1) {
          newSelected.delete(metricKey)
        }
      } else {
        newSelected.add(metricKey)
      }
      setMonthlySelectedMetrics(newSelected)
    }
  }

  useEffect(() => {
    const calculateAnalytics = () => {
      try {
        console.log('Calculating analytics for:', {
          interviews: interviews.length,
          profiles: profiles.length
        })

        const analytics: UserAnalytics[] = []

        // Group interviews by user
        const interviewsByUser = interviews.reduce((acc, interview) => {
          if (!acc[interview.user_id]) {
            acc[interview.user_id] = []
          }
          acc[interview.user_id].push(interview)
          return acc
        }, {} as Record<string, Interview[]>)

        console.log('Interviews grouped by user:', Object.keys(interviewsByUser).length, 'users')

        // Calculate analytics for each user
        Object.entries(interviewsByUser).forEach(([userId, userInterviews]) => {
          const profile = profiles.find(p => p.id === userId)
          const userName = profile?.name || 'Unknown User'

          const totalInterviews = userInterviews.length
          const uniqueCompanies = new Set(userInterviews.map(i => i.company)).size

          // Calculate first interview pass rate
          const companyGroups = userInterviews.reduce((acc, interview) => {
            const key = `${interview.profile}-${interview.company}`
            if (!acc[key]) {
              acc[key] = []
            }
            acc[key].push(interview)
            return acc
          }, {} as Record<string, Interview[]>)

          let firstInterviewsPassed = 0
          let totalFirstInterviews = 0

          Object.values(companyGroups).forEach(groupInterviews => {
            const sortedInterviews = groupInterviews.sort((a, b) => {
              const dateA = new Date(a.interview_date).getTime()
              const dateB = new Date(b.interview_date).getTime()
              return dateA - dateB
            })
            
            const latestInterview = sortedInterviews[sortedInterviews.length - 1]
            
            totalFirstInterviews++
            
            // Check if they progressed beyond the first interview
            if (sortedInterviews.length > 1 || latestInterview.state === 'Offer') {
              firstInterviewsPassed++
            }
          })

          const firstInterviewPassRate = totalFirstInterviews > 0 
            ? Math.round((firstInterviewsPassed / totalFirstInterviews) * 100)
            : 0

          analytics.push({
            userId,
            userName,
            totalInterviews,
            totalCompanies: uniqueCompanies,
            firstInterviewPassRate
          })
        })

        // Sort by total interviews (descending)
        const sortedAnalytics = analytics.sort((a, b) => b.totalInterviews - a.totalInterviews)
        console.log('Final analytics:', sortedAnalytics)
        
        setUserAnalytics(sortedAnalytics)
        
        // Auto-select all users initially for both charts
        const allUserIds = new Set(sortedAnalytics.map(u => u.userId))
        setWeeklySelectedUsers(allUserIds)
        setMonthlySelectedUsers(allUserIds)
        
        // Calculate chart data after setting users
        setTimeout(() => {
          calculateChartData(interviews, profiles, sortedAnalytics)
        }, 100)
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error calculating analytics:', error)
        setIsLoading(false)
      }
    }

    calculateAnalytics()
  }, [interviews, profiles])

  // Recalculate chart data when date ranges change
  useEffect(() => {
    if (userAnalytics.length > 0) {
      calculateChartData(interviews, profiles, userAnalytics)
    }
  }, [weeklyDateRange, monthlyDateRange, userAnalytics, interviews, profiles])

  const calculateChartData = (interviews: Interview[], profiles: Profile[], analytics: UserAnalytics[]) => {
    const today = new Date()
    
    // Weekly data (configurable weeks)
    const weeklyChartData = []
    const weeksToShow = weeklyDateRange.weeks
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (i * 7) - today.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const formatShortDate = (d: Date) =>
        `${d.getMonth() + 1}/${d.getDate()}`
      const weekLabel = `${formatShortDate(weekStart)}~${formatShortDate(weekEnd)}`
      const weekDataPoint: any = { week: weekLabel }
      
      // Calculate metrics for each user
      analytics.forEach(user => {
        const userInterviews = interviews.filter(i => 
          i.user_id === user.userId &&
          new Date(i.interview_date) >= weekStart && 
          new Date(i.interview_date) <= weekEnd
        )
        
        const userCompanyGroups = userInterviews.reduce((acc, interview) => {
          const key = `${interview.profile}-${interview.company}`
          if (!acc[key]) acc[key] = []
          acc[key].push(interview)
          return acc
        }, {} as Record<string, Interview[]>)

        let firstInterviews = 0
        let firstInterviewsPassed = 0
        let nextStepInterviews = 0
        let offers = 0

        Object.values(userCompanyGroups).forEach(groupInterviews => {
          const sortedInterviews = groupInterviews.sort((a, b) => 
            new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime()
          )
          
          const firstInterview = sortedInterviews[0]
          const latestInterview = sortedInterviews[sortedInterviews.length - 1]
          
          const firstInterviewDate = new Date(firstInterview.interview_date)
          if (firstInterviewDate >= weekStart && firstInterviewDate <= weekEnd) {
            firstInterviews++
            if (sortedInterviews.length > 1 || latestInterview.state === 'Offer') {
              firstInterviewsPassed++
            }
          }
          
          groupInterviews.forEach(interview => {
            const interviewDate = new Date(interview.interview_date)
            if (interviewDate >= weekStart && interviewDate <= weekEnd) {
              if (interview.id !== firstInterview.id) {
                nextStepInterviews++
              }
              if (interview.state === 'Offer') {
                offers++
              }
            }
          })
        })

        const passRate = firstInterviews > 0 ? Math.round((firstInterviewsPassed / firstInterviews) * 100) : 0
        
        weekDataPoint[`${user.userId}_interviews`] = userInterviews.length
        weekDataPoint[`${user.userId}_firstInterviewPassRate`] = passRate
        weekDataPoint[`${user.userId}_firstInterviewCount`] = firstInterviews
        weekDataPoint[`${user.userId}_nextStepCount`] = nextStepInterviews
        weekDataPoint[`${user.userId}_offerCount`] = offers
      })
      
      weeklyChartData.push(weekDataPoint)
    }
    
    // Monthly data (configurable months)
    const monthlyChartData = []
    const monthsToShow = monthlyDateRange.months
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
      
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const monthDataPoint: any = { month: monthLabel }
      
      // Calculate metrics for each user (similar to weekly)
      analytics.forEach(user => {
        const userInterviews = interviews.filter(i => 
          i.user_id === user.userId &&
          new Date(i.interview_date) >= monthStart && 
          new Date(i.interview_date) <= monthEnd
        )
        
        const userCompanyGroups = userInterviews.reduce((acc, interview) => {
          const key = `${interview.profile}-${interview.company}`
          if (!acc[key]) acc[key] = []
          acc[key].push(interview)
          return acc
        }, {} as Record<string, Interview[]>)

        let firstInterviews = 0
        let firstInterviewsPassed = 0
        let nextStepInterviews = 0
        let offers = 0

        Object.values(userCompanyGroups).forEach(groupInterviews => {
          const sortedInterviews = groupInterviews.sort((a, b) => 
            new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime()
          )
          
          const firstInterview = sortedInterviews[0]
          const latestInterview = sortedInterviews[sortedInterviews.length - 1]
          
          const firstInterviewDate = new Date(firstInterview.interview_date)
          if (firstInterviewDate >= monthStart && firstInterviewDate <= monthEnd) {
            firstInterviews++
            if (sortedInterviews.length > 1 || latestInterview.state === 'Offer') {
              firstInterviewsPassed++
            }
          }
          
          groupInterviews.forEach(interview => {
            const interviewDate = new Date(interview.interview_date)
            if (interviewDate >= monthStart && interviewDate <= monthEnd) {
              if (interview.id !== firstInterview.id) {
                nextStepInterviews++
              }
              if (interview.state === 'Offer') {
                offers++
              }
            }
          })
        })

        const passRate = firstInterviews > 0 ? Math.round((firstInterviewsPassed / firstInterviews) * 100) : 0
        
        monthDataPoint[`${user.userId}_interviews`] = userInterviews.length
        monthDataPoint[`${user.userId}_firstInterviewPassRate`] = passRate
        monthDataPoint[`${user.userId}_firstInterviewCount`] = firstInterviews
        monthDataPoint[`${user.userId}_nextStepCount`] = nextStepInterviews
        monthDataPoint[`${user.userId}_offerCount`] = offers
      })
      
      monthlyChartData.push(monthDataPoint)
    }
    
    console.log('Chart data calculated:', {
      weeklyData: weeklyChartData.slice(0, 2),
      monthlyData: monthlyChartData.slice(0, 2),
      analytics: analytics.length
    })
    
    setWeeklyData(weeklyChartData)
    setMonthlyData(monthlyChartData)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Analytics</h1>
          <p className="text-gray-600">Loading interview performance data...</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Analytics</h1>
        <p className="text-gray-600">Interview performance overview for all team members</p>  
      </div>

      {/* User Cards */}
      {userAnalytics.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Interview Data</h3>
          <p className="text-gray-600 mb-4">
            {interviews.length === 0 
              ? "No interviews found in the database." 
              : `Found ${interviews.length} interviews but no user analytics could be calculated.`
            }
          </p>
          <div className="text-sm text-gray-500">
            <p>Raw data: {interviews.length} interviews, {profiles.length} profiles</p>
            {interviews.length > 0 && (
              <p className="mt-2">Sample interview user_ids: {interviews.slice(0, 3).map(i => i.user_id).join(', ')}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {userAnalytics.map((user, index) => (
            <div key={user.userId} className="group bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl hover:scale-105 transition-all duration-300">
              {/* User Header */}
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div 
                    className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: getUserColor(user.userId) + '20' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: getUserColor(user.userId) }}>
                      {user.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {user.userName}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">Team Member</p>
                </div>
              </div>

              {/* Summary Text */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <p className="text-gray-800 text-sm leading-relaxed font-medium">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-bold text-blue-600 text-lg">{user.totalInterviews}</span>
                    <span className="text-gray-600">interviews with</span>
                  </span>
                  <br />
                  <span className="inline-flex items-center gap-1">
                    <span className="font-bold text-purple-600 text-lg">{user.totalCompanies}</span>
                    <span className="text-gray-600">companies</span>
                  </span>
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{user.totalInterviews}</div>
                  <div className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Interviews</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{user.totalCompanies}</div>
                  <div className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Companies</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">{user.firstInterviewPassRate}%</div>
                  <div className="text-xs text-green-700 font-semibold uppercase tracking-wide">Pass Rate</div>
                </div>
              </div>

              {/* Pass Rate Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">First Interview Success Rate</span>
                  <span className="text-sm font-bold text-gray-900">{user.firstInterviewPassRate}%</span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                        user.firstInterviewPassRate >= 70 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        user.firstInterviewPassRate >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                        'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${Math.min(user.firstInterviewPassRate, 100)}%` }}
                    ></div>
                  </div>
                  <div 
                    className="absolute top-0 w-1 h-3 bg-white rounded-full shadow-md transition-all duration-500"
                    style={{ left: `${Math.min(user.firstInterviewPassRate, 100)}%`, transform: 'translateX(-50%)' }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Section */}
      {userAnalytics.length > 0 && (
        <div className="space-y-6">
          {/* Weekly Trend Chart */}
          <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-lg border border-blue-100/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Weekly Trends</h3>
                    <p className="text-blue-100 text-sm">Interview performance over time</p>
                  </div>
                </div>
                
                {/* Date Range Selection */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <select
                    value={weeklyDateRange.weeks}
                    onChange={(e) => setWeeklyDateRange({ weeks: parseInt(e.target.value) })}
                    className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
                  >
                    <option value={4} className="text-gray-900">Last 4 weeks</option>
                    <option value={8} className="text-gray-900">Last 8 weeks</option>
                    <option value={12} className="text-gray-900">Last 12 weeks</option>
                    <option value={16} className="text-gray-900">Last 16 weeks</option>
                    <option value={24} className="text-gray-900">Last 24 weeks</option>
                    <option value={52} className="text-gray-900">Last year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="p-8 bg-gradient-to-r from-gray-50 to-blue-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-800">Team Members</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {weeklySelectedUsers.size} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                    {userAnalytics.map((user, index) => (
                      <label key={user.userId} className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={weeklySelectedUsers.has(user.userId)}
                          onChange={() => toggleWeeklyUser(user.userId)}
                          className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getUserColor(user.userId) }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">
                            {user.userName}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Metric Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-800">Metrics</h4>
                    {weeklySelectedUsers.size >= 2 ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        Single selection
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        Multiple selection
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {availableMetrics.map((metric, index) => (
                      <label key={metric.key} className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
                        <input
                          type={weeklySelectedUsers.size >= 2 ? "radio" : "checkbox"}
                          name={weeklySelectedUsers.size >= 2 ? "weeklyMetric" : undefined}
                          checked={weeklySelectedMetrics.has(metric.key)}
                          onChange={() => toggleWeeklyMetric(metric.key)}
                          className="w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500/20"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getMetricColor(metric.key) }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            {metric.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="p-8 bg-white">
              <div className="h-80 relative">
                {/* Chart Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 rounded-2xl"></div>
                
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ bottom: 8, left: 8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    angle={-35}
                    textAnchor="end"
                    height={72}
                    tick={{ fontSize: 11 }}
                    minTickGap={8}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Array.from(weeklySelectedUsers).flatMap((userId) => {
                    const user = userAnalytics.find(u => u.userId === userId)
                    const userColor = getUserColor(userId)
                    
                    return Array.from(weeklySelectedMetrics).map((metricKey, metricIndex) => {
                      const metric = availableMetrics.find(m => m.key === metricKey)
                      
                      // Color logic: if single user, use different colors per metric; if multiple users, use user color
                      const lineColor = weeklySelectedUsers.size === 1 ? getMetricColor(metricKey) : userColor
                      
                      // For multiple metrics on single user, vary the line style
                      const strokeDasharray = weeklySelectedMetrics.size > 1 && weeklySelectedUsers.size === 1 
                        ? metricIndex === 0 ? "0" : metricIndex === 1 ? "5 5" : metricIndex === 2 ? "10 5" : "15 10"
                        : "0"
                      
                      return (
                        <Line
                          key={`${userId}_${metricKey}`}
                          type="monotone"
                          dataKey={`${userId}_${metricKey}`}
                          stroke={lineColor}
                          strokeWidth={2}
                          strokeDasharray={strokeDasharray}
                          name={weeklySelectedUsers.size === 1 ? metric?.label : `${user?.userName} - ${metric?.label}`}
                        />
                      )
                    })
                  })}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl shadow-lg border border-purple-100/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Monthly Overview</h3>
                    <p className="text-purple-100 text-sm">Long-term performance analysis</p>
                  </div>
                </div>
                
                {/* Date Range Selection */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <select
                    value={monthlyDateRange.months}
                    onChange={(e) => setMonthlyDateRange({ months: parseInt(e.target.value) })}
                    className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
                  >
                    <option value={3} className="text-gray-900">Last 3 months</option>
                    <option value={6} className="text-gray-900">Last 6 months</option>
                    <option value={12} className="text-gray-900">Last year</option>
                    <option value={18} className="text-gray-900">Last 18 months</option>
                    <option value={24} className="text-gray-900">Last 2 years</option>
                    <option value={36} className="text-gray-900">Last 3 years</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="p-8 bg-gradient-to-r from-gray-50 to-purple-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-800">Team Members</h4>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      {monthlySelectedUsers.size} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                    {userAnalytics.map((user, index) => (
                      <label key={user.userId} className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={monthlySelectedUsers.has(user.userId)}
                          onChange={() => toggleMonthlyUser(user.userId)}
                          className="w-4 h-4 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500/20"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getUserColor(user.userId) }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">
                            {user.userName}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Metric Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-800">Metrics</h4>
                    {monthlySelectedUsers.size >= 2 ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        Single selection
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        Multiple selection
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {availableMetrics.map((metric, index) => (
                      <label key={metric.key} className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer">
                        <input
                          type={monthlySelectedUsers.size >= 2 ? "radio" : "checkbox"}
                          name={monthlySelectedUsers.size >= 2 ? "monthlyMetric" : undefined}
                          checked={monthlySelectedMetrics.has(metric.key)}
                          onChange={() => toggleMonthlyMetric(metric.key)}
                          className="w-4 h-4 text-pink-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-pink-500/20"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getMetricColor(metric.key) }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            {metric.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="p-8 bg-white">
              <div className="h-80 relative">
                {/* Chart Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-pink-50/30 rounded-2xl"></div>
                
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Array.from(monthlySelectedUsers).flatMap((userId) => {
                    const user = userAnalytics.find(u => u.userId === userId)
                    const userColor = getUserColor(userId)
                    
                    return Array.from(monthlySelectedMetrics).map((metricKey, metricIndex) => {
                      const metric = availableMetrics.find(m => m.key === metricKey)
                      
                      // Color logic: if single user, use different colors per metric; if multiple users, use user color
                      const barColor = monthlySelectedUsers.size === 1 ? getMetricColor(metricKey) : userColor
                      
                      // For multiple metrics on single user, vary the opacity
                      const opacity = monthlySelectedMetrics.size > 1 && monthlySelectedUsers.size === 1 
                        ? 1 - (metricIndex * 0.15) 
                        : 1
                      
                      return (
                        <Bar
                          key={`${userId}_${metricKey}`}
                          dataKey={`${userId}_${metricKey}`}
                          fill={barColor}
                          fillOpacity={opacity}
                          name={monthlySelectedUsers.size === 1 ? metric?.label : `${user?.userName} - ${metric?.label}`}
                        />
                      )
                    })
                  })}
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}