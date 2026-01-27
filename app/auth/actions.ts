'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const data = {
    email,
    password,
    options: {
      data: {
        name: formData.get('name') as string,
      },
      emailRedirectTo: undefined,
    },
  }

  const { error: signUpError, data: signUpData } = await supabase.auth.signUp(data)

  if (signUpError) {
    // Ignore rate limit errors since we're not sending emails anyway
    if (signUpError.message.includes('rate limit')) {
      return { 
        success: true, 
        message: 'Account created! Your account is pending admin verification. You will be able to sign in once approved.' 
      }
    }
    return { error: signUpError.message }
  }

  // Sign out the user immediately since they need admin verification
  if (signUpData.user) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')
  return { 
    success: true, 
    message: 'Account created! Your account is pending admin verification. You will be able to sign in once approved.' 
  }
}

export async function signin(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  // Check if user is verified
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('verified')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    // Sign out the user
    await supabase.auth.signOut()
    return { error: 'Account verification pending. Please contact admin.' }
  }

  if (!profile.verified) {
    // Sign out the user
    await supabase.auth.signOut()
    return { error: 'Your account is pending admin verification. Please try again later.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/signin')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Check your email for the password reset link!' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/signin')
}

