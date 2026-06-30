'use client'

import { useState } from 'react'
import { signup } from '../actions'
import Link from 'next/link'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const result = await signup(formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccess(result.message || 'Account created successfully!')
      form.reset()
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card animate-slide-up">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/auth/signin" className="link-accent">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="label">Full Name</label>
              <input id="name" name="name" type="text" required className="input-field mt-1.5" placeholder="John Doe" />
            </div>

            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input-field mt-1.5" placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} className="input-field mt-1.5" placeholder="••••••••" />
              <p className="mt-1.5 text-xs text-muted">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} className="input-field mt-1.5" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  )
}
