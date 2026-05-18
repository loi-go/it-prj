import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllInterviews } from '../actions'
import AllInterviewsView from './AllInterviewsView'
import AppNav from '@/app/components/AppNav'

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
    .select('verified, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.verified) {
    redirect('/auth/signin?error=Please wait for admin verification')
  }

  const result = await getAllInterviews()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav
        user={user}
        isAdmin={profile.is_admin === true}
        section="interviews"
        interviewsSub="all"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <AllInterviewsView initialInterviews={result.data || []} />
        </div>
      </main>
    </div>
  )
}
