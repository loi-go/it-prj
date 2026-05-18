import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InterviewsTable from './InterviewsTable'
import AppNav from '@/app/components/AppNav'

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
    .select('verified, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.verified) {
    await supabase.auth.signOut()
    redirect('/auth/signin')
  }

  const { data: interviews } = await supabase
    .from('interviews')
    .select('*')
    .eq('user_id', user.id)
    .order('interview_date', { ascending: false })
    .order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav
        user={user}
        isAdmin={profile.is_admin === true}
        section="interviews"
        interviewsSub="mine"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <InterviewsTable initialInterviews={interviews || []} />
        </div>
      </main>
    </div>
  )
}
