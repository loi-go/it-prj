'use client'

import { useState } from 'react'
import { resetPassword } from '../actions'
import Link from 'next/link'

export default function ForgotPasswordPage() {
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
    const result = await resetPassword(formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccess(result.message || 'Password reset email sent!')
      form.reset()
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card animate-slide-up">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Remember your password?{' '}
            <Link href="/auth/signin" className="link-accent">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input-field mt-1.5" placeholder="you@example.com" />
            <p className="mt-2 text-xs text-muted">
              We&apos;ll send you a link to reset your password
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}
