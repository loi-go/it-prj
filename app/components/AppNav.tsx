import Image from 'next/image'
import Link from 'next/link'
import { signout } from '@/app/auth/actions'
import logo from '@/logo.png'
import { createClient } from '@/lib/supabase/server'
import { isProfileCaller } from '@/lib/profileRoles'

type Section = 'standups' | 'interviews' | 'analytics' | 'admin'

type AppNavProps = {
  section: Section
  standupsSub?: 'mine' | 'all'
  interviewsSub?: 'mine' | 'all'
}

function navLinkClass(active: boolean) {
  return active
    ? 'text-sm font-medium text-indigo-600 border-b-2 border-indigo-600'
    : 'text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors'
}

export default async function AppNav({
  section,
  standupsSub,
  interviewsSub,
}: AppNavProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_caller')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin === true
  const isCaller = profile ? isProfileCaller(profile) : false

  const displayName =
    (user.user_metadata?.name as string | undefined) || user.email || 'User'

  const showStandupsTabs = !isCaller && section === 'standups' && standupsSub
  const showInterviewsTabs = !isCaller && section === 'interviews' && interviewsSub

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Image src={logo} alt="RRR" className="h-10 w-auto" priority />
            <div className="flex space-x-6">
              {!isCaller && (
                <Link href="/standups" className={navLinkClass(section === 'standups')}>
                  Daily Standups
                </Link>
              )}
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
