'use client'

import { useState, useTransition } from 'react'
import type { AdminUserRow } from './actions'
import { adminDeleteUser, adminResetPasswordToDefault, adminUpdateProfile } from './actions'

type Props = {
  initialUsers: AdminUserRow[]
  currentUserId: string
}

export default function UserManagement({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function clearAlerts() {
    setMessage(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {(message || error) && (
        <div className="card-flat p-4 text-sm">
          {error && <p className="text-red-600">{error}</p>}
          {message && !error && <p className="text-secondary">{message}</p>}
        </div>
      )}

      <div className="table-shell">
        <table className="min-w-full divide-y divide-border">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-elevated/60">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-elevated-muted/50 transition-colors">
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium text-foreground">{u.name}</div>
                  <div className="text-muted">{u.email ?? u.id}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    {u.verified ? (
                      <span className="badge-success">Verified</span>
                    ) : (
                      <span className="badge-warning">Unverified</span>
                    )}
                    {u.disabled && <span className="badge-danger">Disabled</span>}
                    {u.is_admin && <span className="badge-accent">Admin</span>}
                    {u.is_caller && !u.is_admin && <span className="badge bg-sky-100 text-sky-700">Caller</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => {
                        clearAlerts()
                        startTransition(async () => {
                          const r = await adminUpdateProfile(u.id, { verified: !u.verified })
                          if ('error' in r) setError(r.error)
                          else {
                            setUsers(prev =>
                              prev.map(x =>
                                x.id === u.id ? { ...x, verified: !u.verified } : x
                              )
                            )
                            setMessage('Saved.')
                          }
                        })
                      }}
                    >
                      {u.verified ? 'Unverify' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      disabled={pending || u.id === currentUserId}
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => {
                        clearAlerts()
                        startTransition(async () => {
                          const r = await adminUpdateProfile(u.id, { disabled: !u.disabled })
                          if ('error' in r) setError(r.error)
                          else {
                            setUsers(prev =>
                              prev.map(x =>
                                x.id === u.id ? { ...x, disabled: !u.disabled } : x
                              )
                            )
                            setMessage('Saved.')
                          }
                        })
                      }}
                    >
                      {u.disabled ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      type="button"
                      disabled={pending || u.id === currentUserId}
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => {
                        clearAlerts()
                        startTransition(async () => {
                          const r = await adminUpdateProfile(u.id, { is_admin: !u.is_admin })
                          if ('error' in r) setError(r.error)
                          else {
                            setUsers(prev =>
                              prev.map(x =>
                                x.id === u.id
                                  ? {
                                      ...x,
                                      is_admin: !u.is_admin,
                                      is_caller: !u.is_admin ? false : x.is_caller,
                                    }
                                  : x
                              )
                            )
                            setMessage('Saved.')
                          }
                        })
                      }}
                    >
                      {u.is_admin ? 'Remove admin' : 'Make admin'}
                    </button>
                    <button
                      type="button"
                      disabled={pending || u.id === currentUserId || u.is_admin}
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => {
                        clearAlerts()
                        startTransition(async () => {
                          const r = await adminUpdateProfile(u.id, { is_caller: !u.is_caller })
                          if ('error' in r) setError(r.error)
                          else {
                            setUsers(prev =>
                              prev.map(x =>
                                x.id === u.id
                                  ? {
                                      ...x,
                                      is_caller: !u.is_caller,
                                      is_admin: !u.is_caller ? false : x.is_admin,
                                    }
                                  : x
                              )
                            )
                            setMessage('Saved.')
                          }
                        })
                      }}
                    >
                      {u.is_caller ? 'Remove caller' : 'Make caller'}
                    </button>
                    <button
                      type="button"
                      disabled={pending || u.id === currentUserId}
                      className="btn-secondary !px-2 !py-1 text-xs !border-accent/30 !bg-accent-subtle !text-accent-hover"
                      onClick={() => {
                        if (
                          !confirm(
                            'Set this user\'s password to the default (123456)? Tell them to sign in and change it.'
                          )
                        )
                          return
                        clearAlerts()
                        startTransition(async () => {
                          const r = await adminResetPasswordToDefault(u.id)
                          if ('error' in r) setError(r.error)
                          else setMessage('Password set to default (123456).')
                        })
                      }}
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      disabled={pending || u.id === currentUserId}
                      className="btn-secondary !px-2 !py-1 text-xs !border-red-200 !text-red-700 hover:!bg-danger-muted"
                      onClick={() => {
                        if (!confirm(`Delete user ${u.email ?? u.id}? This cannot be undone.`))
                          return
                        clearAlerts()
                        startTransition(async () => {
                          const r = await adminDeleteUser(u.id)
                          if ('error' in r) setError(r.error)
                          else {
                            setUsers(prev => prev.filter(x => x.id !== u.id))
                            setMessage('User deleted.')
                          }
                        })
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
