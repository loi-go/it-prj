import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/app/components/AppNav'
import UserManagement from './UserManagement'
import { listUsersForAdmin } from './actions'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('verified, disabled, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.verified || profile.disabled) {
    await supabase.auth.signOut()
    redirect('/auth/signin')
  }

  if (!profile.is_admin) {
    redirect('/interviews')
  }

  const list = await listUsersForAdmin()
  const rows = 'data' in list ? list.data : []

  return (
    <div className="page-shell">
      <AppNav section="admin" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="mb-4 heading-page">User management</h2>
          {'error' in list && list.error && (
            <div className="mb-4 alert-warning">{list.error}</div>
          )}
          <UserManagement initialUsers={rows} currentUserId={user.id} />
        </div>
      </main>
    </div>
  )
}
