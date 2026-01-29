'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import sharp from 'sharp'

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

  let imageUrl = null

  // Handle image upload if present
  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    try {
      // Convert File to Buffer
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Optimize image: resize to max width 800px and convert to WebP
      const optimizedBuffer = await sharp(buffer)
        .resize(800, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toBuffer()
      
      const fileName = `${user.id}/${Date.now()}.webp`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interview-images')
        .upload(fileName, optimizedBuffer, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        return { error: `Image upload failed: ${uploadError.message}` }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('interview-images')
        .getPublicUrl(fileName)
      
      imageUrl = publicUrl
    } catch (error) {
      return { error: `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
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
    image_url: imageUrl,
  }

  const { data, error } = await supabase
    .from('interviews')
    .insert([interview])
    .select()
    .single()

  if (error) {
    // Clean up uploaded image if database insert fails
    if (imageUrl) {
      const fileName = imageUrl.split('/').slice(-2).join('/')
      await supabase.storage.from('interview-images').remove([fileName])
    }
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

  // Get current interview to check for existing image
  const { data: currentInterview } = await supabase
    .from('interviews')
    .select('image_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  let imageUrl = currentInterview?.image_url || null

  // Handle image update
  const imageFile = formData.get('image') as File | null
  const deleteImage = formData.get('deleteImage') === 'true'

  if (deleteImage && currentInterview?.image_url) {
    // Delete old image from storage
    const fileName = currentInterview.image_url.split('/').slice(-2).join('/')
    await supabase.storage.from('interview-images').remove([fileName])
    imageUrl = null
  } else if (imageFile && imageFile.size > 0) {
    try {
      // Delete old image if exists
      if (currentInterview?.image_url) {
        const oldFileName = currentInterview.image_url.split('/').slice(-2).join('/')
        await supabase.storage.from('interview-images').remove([oldFileName])
      }

      // Convert File to Buffer
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Optimize image: resize to max width 800px and convert to WebP
      const optimizedBuffer = await sharp(buffer)
        .resize(800, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toBuffer()
      
      const fileName = `${user.id}/${Date.now()}.webp`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interview-images')
        .upload(fileName, optimizedBuffer, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        return { error: `Image upload failed: ${uploadError.message}` }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('interview-images')
        .getPublicUrl(fileName)
      
      imageUrl = publicUrl
    } catch (error) {
      return { error: `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  const updates = {
    profile: formData.get('profile') as string,
    company: formData.get('company') as string,
    step: formData.get('step') as string,
    interview_date: formData.get('interview_date') as string,
    note: formData.get('note') as string || null,
    state: formData.get('state') as string,
    interview_type: formData.get('interview_type') as string || null,
    image_url: imageUrl,
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

  // Get interview to check for image
  const { data: interview } = await supabase
    .from('interviews')
    .select('image_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Delete image from storage if exists
  if (interview?.image_url) {
    const fileName = interview.image_url.split('/').slice(-2).join('/')
    await supabase.storage.from('interview-images').remove([fileName])
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

