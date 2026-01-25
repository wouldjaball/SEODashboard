import { redirect } from 'next/navigation'

// Redirect to the consolidated admin/accounts page
export default function IntegrationsPage() {
  redirect('/admin/accounts')
}
