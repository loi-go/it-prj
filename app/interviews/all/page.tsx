import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllInterviews } from '../actions'
import { getDefaultInterviewDateRange } from '../utils'
import AllInterviewsView from './AllInterviewsView'
import AppNav from '@/app/components/AppNav'
import { isProfileCaller } from '@/lib/profileRoles'

export default async function AllInterviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('verified, is_admin, is_caller')
    .eq('id', user.id)
    .single()

  if (!profile?.verified) {
    redirect('/auth/signin?error=Please wait for admin verification')
  }

  if (isProfileCaller(profile)) {
    redirect('/interviews')
  }

  const result = await getAllInterviews(getDefaultInterviewDateRange())

  return (
    <div className="page-shell">
      <AppNav section="interviews" interviewsSub="all" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <AllInterviewsView initialInterviews={result.data || []} />
        </div>
      </main>
    </div>
  )
}
