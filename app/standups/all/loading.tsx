import Spinner from '@/app/components/Spinner'

export default function Loading() {
  return (
    <div className="page-shell">
      <nav className="nav-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="w-8 h-6 bg-border rounded animate-pulse" />
              <div className="flex space-x-6">
                <div className="w-24 h-4 bg-border rounded animate-pulse" />
                <div className="w-20 h-4 bg-border rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="w-16 h-4 bg-border rounded animate-pulse" />
              <div className="w-20 h-8 bg-border rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <Spinner size="xl" className="mb-4" />
            <p className="text-secondary text-lg font-semibold tracking-tight">Loading standups...</p>
            <p className="text-muted text-sm mt-2">Please wait while we fetch your data</p>
          </div>
        </div>
      </main>
    </div>
  )
}
