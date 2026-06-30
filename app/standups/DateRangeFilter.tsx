type Props = {
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onPreset: (days: number) => void
  onReset: () => void
  isActive: boolean
  resultCount: number
  formatDateLabel: (dateString: string) => string
}

export default function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onPreset,
  onReset,
  isActive,
  resultCount,
  formatDateLabel,
}: Props) {
  return (
    <div className="filter-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label className="label mb-2">Date Range</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div>
              <label htmlFor="standupDateFrom" className="label-sm">From</label>
              <input
                id="standupDateFrom"
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="input-field !py-2"
              />
            </div>
            <span className="hidden sm:flex items-end pb-2 text-sm text-muted px-1">to</span>
            <div>
              <label htmlFor="standupDateTo" className="label-sm">To</label>
              <input
                id="standupDateTo"
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => onDateToChange(e.target.value)}
                className="input-field !py-2"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onPreset(7)} className="btn-chip">
            Last 7 days
          </button>
          <button type="button" onClick={() => onPreset(30)} className="btn-chip">
            Last 30 days
          </button>
          {isActive && (
            <button type="button" onClick={onReset} className="btn-ghost">
              Reset
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        {formatDateLabel(dateFrom)} – {formatDateLabel(dateTo)} · {resultCount} standup{resultCount === 1 ? '' : 's'} in selected range
      </p>
    </div>
  )
}
