import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import StandupsView from './StandupsView'
import Link from 'next/link'

export default async function StandupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Check if user is verified
  const { data: profile } = await supabase
    .from('profiles')
    .select('verified')
    .eq('id', user.id)
    .single()

  if (!profile?.verified) {
    redirect('/auth/signin?error=Please wait for admin verification')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">3R</h1>
              <div className="flex space-x-6">
                <Link
                  href="/standups"
                  className="text-sm font-medium text-indigo-600 border-b-2 border-indigo-600"
                >
                  Daily Standups
                </Link>
                <Link
                  href="/interviews"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  Interviews
                </Link>
                <Link
                  href="/analytics"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  Analytics
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex space-x-4">
                <Link
                  href="/standups"
                  className="text-sm font-medium text-indigo-600 border-b-2 border-indigo-600"
                >
                  Mine
                </Link>
                <Link
                  href="/standups/all"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  All
                </Link>
              </div>
              <span className="text-sm text-gray-700">
                {user.user_metadata?.name || user.email}
              </span>
              <form action={signout}>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <StandupsView currentUserId={user.id} initialViewMode="mine" />
        </div>
      </main>
    </div>
  )
}