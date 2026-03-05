import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { EmailService } from '@/lib/services/email-service'
import { getEnv } from '@/lib/env'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      // Generic success to prevent email enumeration
      return NextResponse.json({ success: true })
    }

    const appUrl = getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    const serviceClient = createServiceClient()

    // Generate a recovery link without Supabase sending its own email
    const { data, error } = await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
      },
    })

    if (error) {
      // Log for debugging but return generic success to prevent enumeration
      console.error('Failed to generate recovery link:', error.message)
      return NextResponse.json({ success: true })
    }

    if (data?.properties?.action_link) {
      // Send via Resend (our custom email service)
      const result = await EmailService.sendPasswordResetEmail(
        email.trim(),
        data.properties.action_link
      )

      if (!result.success) {
        console.error('Failed to send password reset email:', result.error)
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ success: true })
  }
}
