type Props = {
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onPreset: (days: number) => void
  onReset: () => void
  isActive: boolean
  resultCount: number
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
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date Range
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-gray-900 bg-white"
            />
            <span className="hidden sm:flex items-center text-sm text-gray-400 px-1">to</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => onDateToChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPreset(7)}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => onPreset(30)}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Last 30 days
          </button>
          {isActive && (
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {resultCount} standup{resultCount === 1 ? '' : 's'} in selected range
      </p>
    </div>
  )
}
