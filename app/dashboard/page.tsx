import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '../auth/actions'
import InterviewsTable from '../interviews/InterviewsTable'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Check if user is verified
  const { data: profile } = await supabase
    .from('profiles')
    .select('verified')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.verified) {
    await supabase.auth.signOut()
    redirect('/auth/signin')
  }

  // Fetch user's interviews
  const { data: interviews } = await supabase
    .from('interviews')
    .select('*')
    .eq('user_id', user.id)
    .order('interview_date', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Interview Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
            <Link
              href="/standups"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
            >
              Daily Standups
            </Link>
              <Link
                href="/interviews/all"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                All Interviews
              </Link>
              <span className="text-sm text-gray-700">
                {user.user_metadata?.name || user.email}
              </span>
              <form action={signout}>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <InterviewsTable initialInterviews={interviews || []} />
        </div>
      </main>
    </div>
  )
}

