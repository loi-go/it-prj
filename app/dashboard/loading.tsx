import Spinner from '@/app/components/Spinner'

export default function Loading() {
  return (
    <div className="page-shell flex items-center justify-center">
      <div className="flex flex-col items-center animate-fade-in">
        <Spinner size="xl" className="mb-4" />
        <p className="text-secondary text-lg font-semibold tracking-tight">Loading...</p>
        <p className="text-muted text-sm mt-2">Please wait</p>
      </div>
    </div>
  )
}
