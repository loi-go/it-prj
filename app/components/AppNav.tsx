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
  return active ? 'nav-link-active' : 'nav-link'
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
    <nav className="nav-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href={isCaller ? '/interviews' : '/standups'} className="shrink-0">
              <Image src={logo} alt="RRR" className="h-9 w-auto" priority />
            </Link>
            <div className="hidden sm:flex items-center gap-1">
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
          <div className="flex items-center gap-4">
            {showStandupsTabs && (
              <div className="hidden md:flex items-center gap-1 rounded-xl bg-elevated-muted/80 p-1 border border-border/50">
                <Link href="/standups" className={navLinkClass(standupsSub === 'mine')}>
                  Mine
                </Link>
                <Link href="/standups/all" className={navLinkClass(standupsSub === 'all')}>
                  All
                </Link>
              </div>
            )}
            {showInterviewsTabs && (
              <div className="hidden md:flex items-center gap-1 rounded-xl bg-elevated-muted/80 p-1 border border-border/50">
                <Link href="/interviews" className={navLinkClass(interviewsSub === 'mine')}>
                  Mine
                </Link>
                <Link href="/interviews/all" className={navLinkClass(interviewsSub === 'all')}>
                  All
                </Link>
              </div>
            )}
            <span className="hidden sm:inline text-sm text-secondary font-medium truncate max-w-[140px]">
              {displayName}
            </span>
            <form action={signout}>
              <button type="submit" className="btn-secondary !py-2 !px-3.5 text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
