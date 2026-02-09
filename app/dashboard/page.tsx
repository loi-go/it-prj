import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Redirect to the new interviews page
  redirect('/interviews')
}

