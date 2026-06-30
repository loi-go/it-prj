import {
  formatInterviewDateRangeSummary,
  INTERVIEW_DATE_PRESETS,
  type InterviewDatePreset,
} from './utils'

type Props = {
  dateFrom: string
  dateTo: string
  activePreset: InterviewDatePreset | null
  onPresetSelect: (preset: InterviewDatePreset) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  loading?: boolean
}

export default function InterviewDateRangeFilter({
  dateFrom,
  dateTo,
  activePreset,
  onPresetSelect,
  onDateFromChange,
  onDateToChange,
  loading = false,
}: Props) {
  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : undefined}>
      <label htmlFor="interviewDatePreset" className="label mb-2">
        Date Range
      </label>

      <select
        id="interviewDatePreset"
        value={activePreset ?? 'custom'}
        disabled={loading}
        onChange={(e) => {
          if (e.target.value !== 'custom') {
            onPresetSelect(e.target.value as InterviewDatePreset)
          }
        }}
        className="input-field !py-2 mb-3 disabled:opacity-50"
      >
        <option value="custom">Custom range</option>
        {INTERVIEW_DATE_PRESETS.map(preset => (
          <option key={preset.key} value={preset.key}>
            {preset.label}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label htmlFor="filterDateFrom" className="label-sm">From</label>
          <input
            id="filterDateFrom"
            type="date"
            value={dateFrom}
            max={dateTo}
            disabled={loading}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="input-field !py-2 disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="filterDateTo" className="label-sm">To</label>
          <input
            id="filterDateTo"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            disabled={loading}
            onChange={(e) => onDateToChange(e.target.value)}
            className="input-field !py-2 disabled:opacity-50"
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        {formatInterviewDateRangeSummary(dateFrom, dateTo)}
      </p>
    </div>
  )
}
