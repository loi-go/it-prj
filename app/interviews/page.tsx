import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InterviewsTable from './InterviewsTable'
import AppNav from '@/app/components/AppNav'
import { getInterviews } from './actions'
import { getDefaultInterviewDateRange } from './utils'

export default async function InterviewsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('verified')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.verified) {
    await supabase.auth.signOut()
    redirect('/auth/signin')
  }

  const result = await getInterviews(getDefaultInterviewDateRange())

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav section="interviews" interviewsSub="mine" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <InterviewsTable initialInterviews={result.data || []} />
        </div>
      </main>
    </div>
  )
}
