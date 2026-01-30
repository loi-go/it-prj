'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type StandupContent = {
  text: string
}

export type StandupSubtitle = {
  subtitle: string
  contents: StandupContent[]
}

export type StandupItem = {
  title: string
  subtitles: StandupSubtitle[]
  contents: StandupContent[]
}

export type DailyStandup = {
  id: string
  user_id: string
  standup_date: string
  items: StandupItem[]
  created_at: string
  updated_at: string
  profiles?: {
    name: string
  }
}

export async function getMyStandups() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('daily_standups')
    .select('*')
    .eq('user_id', user.id)
    .order('standup_date', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function getAllStandups() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get all standups with user profiles
  const { data: standupsData, error: standupsError } = await supabase
    .from('daily_standups')
    .select('*')
    .order('standup_date', { ascending: false })

  if (standupsError) {
    return { error: standupsError.message }
  }

  // Get all profiles
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name')

  if (profilesError) {
    return { error: profilesError.message }
  }

  // Map profiles to standups
  const profilesMap = new Map(profilesData?.map(p => [p.id, p.name]) || [])
  
  const data = standupsData?.map(standup => ({
    ...standup,
    profiles: {
      name: profilesMap.get(standup.user_id) || 'Unknown'
    }
  }))

  return { data }
}

export async function createOrUpdateStandup(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const standupDate = formData.get('standup_date') as string
  const itemsJson = formData.get('items') as string
  
  let items: StandupItem[]
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { error: 'Invalid items format' }
  }

  // Check if standup already exists for this date
  const { data: existing } = await supabase
    .from('daily_standups')
    .select('id')
    .eq('user_id', user.id)
    .eq('standup_date', standupDate)
    .single()

  let result
  if (existing) {
    // Update existing
    result = await supabase
      .from('daily_standups')
      .update({ items })
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    // Create new
    result = await supabase
      .from('daily_standups')
      .insert([{
        user_id: user.id,
        standup_date: standupDate,
        items
      }])
      .select()
      .single()
  }

  if (result.error) {
    return { error: result.error.message }
  }

  revalidatePath('/standups')
  return { success: true, data: result.data }
}

export async function deleteStandup(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('daily_standups')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/standups')
  return { success: true }
}