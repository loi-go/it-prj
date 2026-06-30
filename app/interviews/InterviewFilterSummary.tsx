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
    <div className="rounded-xl border border-accent/20 bg-accent-subtle px-3 py-2">
      <p className="text-sm font-semibold text-accent-hover">
        {loading ? 'Loading interviews...' : `${interviewCount} interview${interviewCount === 1 ? '' : 's'}`}
      </p>
      {!loading && (
        <p className="mt-1 text-xs text-accent">
          {companyCount} compan{companyCount === 1 ? 'y' : 'ies'} · {interviewCount} of {totalInterviewCount} loaded
        </p>
      )}
    </div>
  )
}
