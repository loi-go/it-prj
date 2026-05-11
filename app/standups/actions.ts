'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type DailyStandup = {
  id: string
  user_id: string
  standup_date: string
  plan: string
  followup?: string | null
  created_at: string
  updated_at: string
  profiles?: {
    name: string
  }
}

export async function getMyStandups() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('daily_standups')
    .select('id, user_id, standup_date, plan, followup, created_at, updated_at')
    .eq('user_id', user.id)
    .order('standup_date', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as DailyStandup[] }
}

export async function getAllStandups() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get the current user's signup date (via profile) so we only
  // show standups from on/after that date to this user.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', user.id)
    .single()

  if (profileError) return { error: profileError.message }

  let standupsQuery = supabase
    .from('daily_standups')
    .select('id, user_id, standup_date, plan, followup, created_at, updated_at')

  // If we have a profile creation date, filter out standups that
  // are older than when this user signed up.
  if (profile?.created_at) {
    const createdAtDate = new Date(profile.created_at)
    const year = createdAtDate.getUTCFullYear()
    const month = String(createdAtDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(createdAtDate.getUTCDate()).padStart(2, '0')
    const signupDate = `${year}-${month}-${day}`

    standupsQuery = standupsQuery.gte('standup_date', signupDate)
  }

  const { data: standupsData, error: standupsError } = await standupsQuery
    .order('standup_date', { ascending: false })

  if (standupsError) return { error: standupsError.message }

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name')

  if (profilesError) return { error: profilesError.message }

  const profilesMap = new Map(profilesData?.map(p => [p.id, p.name]) || [])

  const data: DailyStandup[] = (standupsData ?? []).map(standup => ({
    ...standup,
    profiles: { name: profilesMap.get(standup.user_id) || 'Unknown' }
  }))

  return { data }
}

export async function createOrUpdateStandup(standupDate: string, plan: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: existing } = await supabase
    .from('daily_standups')
    .select('id')
    .eq('user_id', user.id)
    .eq('standup_date', standupDate)
    .single()

  let result
  if (existing) {
    result = await supabase
      .from('daily_standups')
      .update({ plan })
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await supabase
      .from('daily_standups')
      .insert([{ user_id: user.id, standup_date: standupDate, plan }])
      .select()
      .single()
  }

  if (result.error) return { error: result.error.message }

  revalidatePath('/standups')
  return { success: true, data: result.data }
}

export async function submitFollowup(standupId: string, followup: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('daily_standups')
    .update({ followup })
    .eq('id', standupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/standups')
  return { success: true }
}

export async function deleteStandup(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('daily_standups')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/standups')
  return { success: true }
}
