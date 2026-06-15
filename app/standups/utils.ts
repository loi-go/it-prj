export const STANDUPS_DEFAULT_DAYS = 7

export function getLocalDateString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getStandupsCutoffDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDefaultStandupDateRange() {
  return {
    from: getStandupsCutoffDate(STANDUPS_DEFAULT_DAYS),
    to: getLocalDateString(),
  }
}

export function formatDateLabel(dateString: string) {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
