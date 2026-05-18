'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminUserRow = {
  id: string
  email: string | undefined
  created_at: string
  name: string
  verified: boolean
  disabled: boolean
  is_admin: boolean
}

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, disabled')
    .eq('id', user.id)
    .single()

  if (error || !profile) return { ok: false, error: 'Profile not found' }
  if (profile.disabled) return { ok: false, error: 'Account disabled' }
  if (!profile.is_admin) return { ok: false, error: 'Forbidden' }

  return { ok: true, userId: user.id }
}

export async function listUsersForAdmin(): Promise<
  { data: AdminUserRow[] } | { error: string }
> {
  const gate = await requireAdmin()
  if (!gate.ok) return { error: gate.error }

  const admin = createAdminClient()
  if (!admin) {
    return {
      error:
        'Server is missing SUPABASE_SERVICE_ROLE_KEY; user listing with emails requires it.',
    }
  }

  const collected: { id: string; email?: string; created_at: string }[] = []
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) return { error: error.message }
    for (const u of data.users) {
      collected.push({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      })
    }
    if (data.users.length < 200) break
    page += 1
  }

  const supabase = await createClient()
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, verified, disabled, is_admin')

  if (profilesError) return { error: profilesError.message }

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  const rows: AdminUserRow[] = collected.map(u => {
    const p = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      name: p?.name ?? '—',
      verified: p?.verified ?? false,
      disabled: p?.disabled ?? false,
      is_admin: p?.is_admin ?? false,
    }
  })

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return { data: rows }
}

export async function adminUpdateProfile(
  userId: string,
  patch: { verified?: boolean; disabled?: boolean; is_admin?: boolean }
): Promise<{ success: true } | { error: string }> {
  const gate = await requireAdmin()
  if (!gate.ok) return { error: gate.error }
  if (userId === gate.userId) {
    if (patch.disabled === true) return { error: 'You cannot disable your own account.' }
    if (patch.is_admin === false) return { error: 'You cannot remove your own admin role here.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function adminDeleteUser(userId: string): Promise<
  { success: true } | { error: string }
> {
  const gate = await requireAdmin()
  if (!gate.ok) return { error: gate.error }
  if (userId === gate.userId) return { error: 'You cannot delete your own account.' }

  const admin = createAdminClient()
  if (!admin) {
    return { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY; delete user requires it.' }
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath('/', 'layout')
  return { success: true }
}

const ADMIN_DEFAULT_PASSWORD = '123456'

/** Sets the user's auth password to the app default (admin-only, service role). */
export async function adminResetPasswordToDefault(
  userId: string
): Promise<{ success: true } | { error: string }> {
  const gate = await requireAdmin()
  if (!gate.ok) return { error: gate.error }
  if (userId === gate.userId) {
    return { error: 'You cannot reset your own password from this screen.' }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY; password reset requires it.' }
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: ADMIN_DEFAULT_PASSWORD,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}
