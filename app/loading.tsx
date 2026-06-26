import Spinner from '@/app/components/Spinner'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Spinner size="xl" className="mb-4" />
        <p className="text-gray-600 text-lg font-medium">Loading...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait</p>
      </div>
    </div>
  )
}