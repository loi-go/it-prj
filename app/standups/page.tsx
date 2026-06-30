import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StandupsView from './StandupsView'
import AppNav from '@/app/components/AppNav'
import { isProfileCaller } from '@/lib/profileRoles'

export default async function StandupsPage() {
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

  return (
    <div className="page-shell">
      <AppNav section="standups" standupsSub="mine" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <StandupsView currentUserId={user.id} initialViewMode="mine" />
        </div>
      </main>
    </div>
  )
}
