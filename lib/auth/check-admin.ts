import { createClient } from '@/lib/supabase/server'

interface CompanyWithRole {
  id: string
  name: string
  industry: string
  color: string
  logo_url?: string
  role: 'owner' | 'admin' | 'client'
}

/**
 * Get the role of a user in a specific company
 * Returns null if user is not assigned to the company
 */
export async function getUserRole(
  userId: string,
  companyId: string
): Promise<'owner' | 'admin' | 'client' | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return null
    }

    return data.role
  } catch (error) {
    console.error('getUserRole error:', error)
    return null
  }
}

/**
 * Check if a user is an owner of a specific company
 */
export async function isUserOwner(
  userId: string,
  companyId: string
): Promise<boolean> {
  const role = await getUserRole(userId, companyId)
  return role === 'owner'
}

/**
 * Check if a user is an owner or admin of a specific company
 */
export async function isUserOwnerOrAdmin(
  userId: string,
  companyId: string
): Promise<boolean> {
  const role = await getUserRole(userId, companyId)
  return role === 'owner' || role === 'admin'
}

/**
 * Get all companies a user has access to, along with their roles
 */
export async function getUserCompaniesWithRole(
  userId: string
): Promise<CompanyWithRole[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_companies')
      .select(`
        role,
        companies (
          id,
          name,
          industry,
          color,
          logo_url
        )
      `)
      .eq('user_id', userId)

    if (error || !data) {
      return []
    }

    return data.map((item: any) => ({
      ...item.companies,
      role: item.role
    }))
  } catch (error) {
    console.error('getUserCompaniesWithRole error:', error)
    return []
  }
}

/**
 * Get all companies where the user is an owner or admin
 */
export async function getUserOwnedCompanies(
  userId: string
): Promise<CompanyWithRole[]> {
  const companies = await getUserCompaniesWithRole(userId)
  return companies.filter(c => c.role === 'owner' || c.role === 'admin')
}

/**
 * Check if a user has owner or admin role in at least one company
 */
export async function hasAdminAccess(userId: string): Promise<boolean> {
  const ownedCompanies = await getUserOwnedCompanies(userId)
  return ownedCompanies.length > 0
}
