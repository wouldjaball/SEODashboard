#!/usr/bin/env tsx

/**
 * Apply new database migrations to Supabase
 * This script applies migrations 021 and 022 for the user access fixes
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

async function applyMigrations() {
  // Read environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  console.log('🔗 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Check connection
  const { data: testData, error: testError } = await supabase
    .from('companies')
    .select('count')
    .limit(1)

  if (testError) {
    throw new Error(`Failed to connect to Supabase: ${testError.message}`)
  }

  console.log('✅ Connected to Supabase successfully')

  // Read migration files
  const migration021 = readFileSync('./supabase/migrations/021_fix_bushive_company_name.sql', 'utf-8')
  const migration022 = readFileSync('./supabase/migrations/022_enhance_rls_policies_for_access.sql', 'utf-8')

  console.log('📄 Loaded migration files:')
  console.log('- 021_fix_bushive_company_name.sql')
  console.log('- 022_enhance_rls_policies_for_access.sql')

  try {
    console.log('\n🔄 Applying migration 021: Fix Bushive company name...')
    
    // Apply migration 021 - Fix company name
    const { error: error021 } = await supabase.rpc('exec_sql', {
      sql: migration021
    })

    if (error021) {
      console.error('❌ Failed to apply migration 021:', error021)
    } else {
      console.log('✅ Migration 021 applied successfully')
    }

    console.log('\n🔄 Applying migration 022: Enhance RLS policies...')
    
    // Apply migration 022 - Enhance RLS policies
    const { error: error022 } = await supabase.rpc('exec_sql', {
      sql: migration022
    })

    if (error022) {
      console.error('❌ Failed to apply migration 022:', error022)
    } else {
      console.log('✅ Migration 022 applied successfully')
    }

    // Verify the Bus Hive name change
    console.log('\n🔍 Verifying company name update...')
    const { data: companies, error: verifyError } = await supabase
      .from('companies')
      .select('id, name, industry')
      .ilike('name', '%bus%')

    if (verifyError) {
      console.warn('⚠️  Could not verify company update:', verifyError)
    } else {
      console.log('📊 Companies with "bus" in name:', companies)
    }

    console.log('\n🎉 All migrations applied successfully!')
    
  } catch (error) {
    console.error('💥 Error applying migrations:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  applyMigrations().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { applyMigrations }