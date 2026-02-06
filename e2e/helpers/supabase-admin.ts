import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. ' +
      'Ensure .env.local is loaded or these vars are set.'
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}

export async function createTestUser(
  email: string,
  password: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const client = getAdminClient();
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata ?? {},
  });
  if (error) throw new Error(`Failed to create test user ${email}: ${error.message}`);
  return data.user.id;
}

export async function deleteTestUser(userId: string): Promise<void> {
  const client = getAdminClient();
  await client.from('user_companies').delete().eq('user_id', userId);
  await client.auth.admin.deleteUser(userId);
}

export async function assignUserToCompany(
  userId: string,
  companyId: string,
  role: 'owner' | 'admin' | 'viewer' | 'client'
): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('user_companies').upsert(
    { user_id: userId, company_id: companyId, role },
    { onConflict: 'user_id,company_id' }
  );
  if (error) throw new Error(`Failed to assign user to company: ${error.message}`);
}

export async function getFirstCompanyId(): Promise<string> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('companies')
    .select('id')
    .order('name')
    .limit(1)
    .single();
  if (error || !data) throw new Error('No companies in database for tests');
  return data.id;
}

export async function clearUserCompanies(userId: string): Promise<void> {
  const client = getAdminClient();
  await client.from('user_companies').delete().eq('user_id', userId);
}

export async function cleanupTestUsers(): Promise<void> {
  const client = getAdminClient();
  const { data: existingUsers } = await client.auth.admin.listUsers({ perPage: 1000 });
  if (existingUsers) {
    for (const user of existingUsers.users) {
      if (user.email?.includes('e2e-test')) {
        await client.from('user_companies').delete().eq('user_id', user.id);
        await client.auth.admin.deleteUser(user.id);
      }
    }
  }
}

// ============= Company Helpers =============

export async function createTestCompany(
  name: string,
  industry: string = 'Test Industry',
  color: string = '#3b82f6'
): Promise<string> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('companies')
    .insert({ name, industry, color })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create test company: ${error.message}`);
  return data.id;
}

export async function deleteTestCompany(companyId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('companies').delete().eq('id', companyId);
  if (error) throw new Error(`Failed to delete test company: ${error.message}`);
}

export async function getCompanyByName(name: string): Promise<{ id: string; name: string } | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('companies')
    .select('id, name')
    .eq('name', name)
    .single();
  if (error) return null;
  return data;
}

export async function cleanupTestCompanies(): Promise<void> {
  const client = getAdminClient();
  const { data } = await client
    .from('companies')
    .select('id')
    .ilike('name', 'e2e-test-%');
  if (data) {
    for (const company of data) {
      await deleteTestCompany(company.id);
    }
  }
}

// ============= Access Code Helpers =============

export async function createTestAccessCode(
  code: string,
  description?: string,
  isActive: boolean = true
): Promise<string> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('access_codes')
    .insert({ code: code.toUpperCase(), description, is_active: isActive })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create test access code: ${error.message}`);
  return data.id;
}

export async function getAccessCodeByCode(code: string): Promise<{ id: string; code: string; is_active: boolean } | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('access_codes')
    .select('id, code, is_active')
    .eq('code', code.toUpperCase())
    .single();
  if (error) return null;
  return data;
}

export async function cleanupTestAccessCodes(): Promise<void> {
  const client = getAdminClient();
  await client.from('access_codes').delete().ilike('code', 'E2E-TEST-%');
}

// ============= Invitation Helpers =============

export async function cleanupTestInvitations(): Promise<void> {
  const client = getAdminClient();
  await client.from('pending_invitations').delete().ilike('email', '%e2e-test-%');
}
