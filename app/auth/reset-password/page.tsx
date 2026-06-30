'use client'

import { useState } from 'react'
import { updatePassword } from '../actions'

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const result = await updatePassword(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card animate-slide-up">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="label">New Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} className="input-field mt-1.5" placeholder="••••••••" />
              <p className="mt-1.5 text-xs text-muted">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} className="input-field mt-1.5" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
