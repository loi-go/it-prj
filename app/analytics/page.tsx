import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AllUsersAnalyticsView from './AllUsersAnalyticsView'
import AppNav from '@/app/components/AppNav'
import { isProfileCaller } from '@/lib/profileRoles'

export default async function AnalyticsPage() {
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

  if (!profile || !profile.verified) {
    await supabase.auth.signOut()
    redirect('/auth/signin')
  }

  const isCaller = isProfileCaller(profile)

  let interviewsQuery = supabase
    .from('interviews')
    .select('*')
    .order('interview_date', { ascending: false })
    .order('updated_at', { ascending: false })

  if (isCaller) {
    interviewsQuery = interviewsQuery.eq('user_id', user.id)
  }

  const { data: interviews, error: interviewsError } = await interviewsQuery

  let profilesQuery = supabase
    .from('profiles')
    .select('id, name')
    .eq('verified', true)

  if (isCaller) {
    profilesQuery = profilesQuery.eq('id', user.id)
  }

  const { data: profiles, error: profilesError } = await profilesQuery

  if (interviewsError) console.log('Interviews error:', interviewsError)
  if (profilesError) console.log('Profiles error:', profilesError)

  return (
    <div className="page-shell">
      <AppNav section="analytics" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <AllUsersAnalyticsView
            interviews={interviews || []}
            profiles={profiles || []}
            viewerOnlySelf={isCaller}
          />
        </div>
      </main>
    </div>
  )
}
