'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getInterviews() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('user_id', user.id)
    .order('interview_date', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function getAllInterviews() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get all interviews
  const { data: interviewsData, error: interviewsError } = await supabase
    .from('interviews')
    .select('*')
    .order('interview_date', { ascending: false })

  if (interviewsError) {
    console.error('Error fetching interviews:', interviewsError)
    return { error: interviewsError.message }
  }

  // Get all profiles
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name')

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return { error: profilesError.message }
  }

  // Map profiles to interviews
  const profilesMap = new Map(profilesData?.map(p => [p.id, p.name]) || [])
  
  const data = interviewsData?.map(interview => ({
    ...interview,
    profiles: {
      name: profilesMap.get(interview.user_id) || 'Unknown'
    }
  }))

  return { data }
}

export async function createInterview(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const interview = {
    user_id: user.id,
    profile: formData.get('profile') as string,
    company: formData.get('company') as string,
    step: formData.get('step') as string,
    interview_date: formData.get('interview_date') as string,
    note: formData.get('note') as string || null,
    state: formData.get('state') as string || 'Ongoing',
    interview_type: formData.get('interview_type') as string || null,
  }

  const { data, error } = await supabase
    .from('interviews')
    .insert([interview])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function updateInterview(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const updates = {
    profile: formData.get('profile') as string,
    company: formData.get('company') as string,
    step: formData.get('step') as string,
    interview_date: formData.get('interview_date') as string,
    note: formData.get('note') as string || null,
    state: formData.get('state') as string,
    interview_type: formData.get('interview_type') as string || null,
  }

  const { data, error } = await supabase
    .from('interviews')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true, data }
}

export async function deleteInterview(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('interviews')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

