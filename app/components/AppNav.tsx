import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { signout } from '@/app/auth/actions'

type Section = 'standups' | 'interviews' | 'analytics' | 'admin'

type AppNavProps = {
  user: User
  isAdmin: boolean
  section: Section
  standupsSub?: 'mine' | 'all'
  interviewsSub?: 'mine' | 'all'
}

function navLinkClass(active: boolean) {
  return active
    ? 'text-sm font-medium text-indigo-600 border-b-2 border-indigo-600'
    : 'text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors'
}

export default function AppNav({
  user,
  isAdmin,
  section,
  standupsSub,
  interviewsSub,
}: AppNavProps) {
  const displayName =
    (user.user_metadata?.name as string | undefined) || user.email || 'User'

  const showStandupsTabs = section === 'standups' && standupsSub
  const showInterviewsTabs = section === 'interviews' && interviewsSub

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">3R</h1>
            <div className="flex space-x-6">
              <Link href="/standups" className={navLinkClass(section === 'standups')}>
                Daily Standups
              </Link>
              <Link href="/interviews" className={navLinkClass(section === 'interviews')}>
                Interviews
              </Link>
              <Link href="/analytics" className={navLinkClass(section === 'analytics')}>
                Analytics
              </Link>
              {isAdmin && (
                <Link href="/admin" className={navLinkClass(section === 'admin')}>
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {showStandupsTabs && (
              <div className="flex space-x-4">
                <Link href="/standups" className={navLinkClass(standupsSub === 'mine')}>
                  Mine
                </Link>
                <Link href="/standups/all" className={navLinkClass(standupsSub === 'all')}>
                  All
                </Link>
              </div>
            )}
            {showInterviewsTabs && (
              <div className="flex space-x-4">
                <Link href="/interviews" className={navLinkClass(interviewsSub === 'mine')}>
                  Mine
                </Link>
                <Link
                  href="/interviews/all"
                  className={navLinkClass(interviewsSub === 'all')}
                >
                  All
                </Link>
              </div>
            )}
            <span className="text-sm text-gray-700">{displayName}</span>
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
  )
}
