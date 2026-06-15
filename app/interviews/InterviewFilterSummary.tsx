type Props = {
  interviewCount: number
  companyCount: number
  totalInterviewCount: number
  loading?: boolean
}

export default function InterviewFilterSummary({
  interviewCount,
  companyCount,
  totalInterviewCount,
  loading = false,
}: Props) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
      <p className="text-sm font-semibold text-indigo-900">
        {loading ? 'Loading interviews...' : `${interviewCount} interview${interviewCount === 1 ? '' : 's'}`}
      </p>
      {!loading && (
        <p className="mt-1 text-xs text-indigo-700">
          {companyCount} compan{companyCount === 1 ? 'y' : 'ies'} · {interviewCount} of {totalInterviewCount} loaded
        </p>
      )}
    </div>
  )
}
