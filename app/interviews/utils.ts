export const INTERVIEWS_DEFAULT_MONTHS = 2

export type InterviewDatePreset = '1w' | '2w' | '1m' | '2m' | '6m' | 'all'

export type InterviewDateRange = {
  from?: string
  to?: string
}

export const INTERVIEW_DATE_PRESETS: { key: InterviewDatePreset; label: string }[] = [
  { key: '1w', label: '1 week ago' },
  { key: '2w', label: '2 weeks ago' },
  { key: '1m', label: '1 month ago' },
  { key: '2m', label: '2 months ago' },
  { key: '6m', label: '6 months ago' },
  { key: 'all', label: 'All' },
]

export function getLocalDateString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDaysAgoDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getInterviewCutoffDate(months: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getInterviewDateRangeForPreset(preset: InterviewDatePreset): InterviewDateRange {
  const to = getLocalDateString()

  switch (preset) {
    case '1w':
      return { from: getDaysAgoDate(7), to }
    case '2w':
      return { from: getDaysAgoDate(14), to }
    case '1m':
      return { from: getInterviewCutoffDate(1), to }
    case '2m':
      return { from: getInterviewCutoffDate(2), to }
    case '6m':
      return { from: getInterviewCutoffDate(6), to }
    case 'all':
      return { to }
  }
}

export function getDefaultInterviewDateRange() {
  return getInterviewDateRangeForPreset('2m')
}

export function matchInterviewDatePreset(from: string, to: string): InterviewDatePreset | null {
  for (const preset of INTERVIEW_DATE_PRESETS) {
    const range = getInterviewDateRangeForPreset(preset.key)
    if ((range.from || '') === from && range.to === to) {
      return preset.key
    }
  }
  return null
}

export function formatDateLabel(dateString: string) {
  if (!dateString) return 'Beginning'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatInterviewDateRangeSummary(from: string, to: string) {
  return `${formatDateLabel(from)} – ${formatDateLabel(to)}`
}
