import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AllUsersAnalyticsView from './AllUsersAnalyticsView'
import AppNav from '@/app/components/AppNav'

export default async function AnalyticsPage() {
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
    .select('verified, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.verified) {
    await supabase.auth.signOut()
    redirect('/auth/signin')
  }

  // Fetch all interviews
  const { data: interviews, error: interviewsError } = await supabase
    .from('interviews')
    .select('*')
    .order('interview_date', { ascending: false })
    .order('updated_at', { ascending: false })

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('verified', true)

  // Log for debugging
  console.log('Interviews data:', interviews?.length || 0, 'interviews')
  console.log('Profiles data:', profiles?.length || 0, 'profiles')
  if (interviewsError) console.log('Interviews error:', interviewsError)
  if (profilesError) console.log('Profiles error:', profilesError)

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav
        user={user}
        isAdmin={profile.is_admin === true}
        section="analytics"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <AllUsersAnalyticsView 
            interviews={interviews || []} 
            profiles={profiles || []}
          />
        </div>
      </main>
    </div>
  )
}