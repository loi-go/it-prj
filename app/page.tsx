import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHomePathForProfile } from '@/lib/profileRoles'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_caller')
      .eq('id', user.id)
      .single()

    redirect(profile ? getHomePathForProfile(profile) : '/standups')
  } else {
    redirect('/auth/signin')
  }
}
