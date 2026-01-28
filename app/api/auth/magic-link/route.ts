import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Use service role client to check if user exists in auth.users
    const serviceClient = createServiceClient()
    const { data: authUsers, error: listError } = await serviceClient.auth.admin.listUsers()

    if (listError) {
      console.error("Error listing users:", listError)
      return NextResponse.json(
        { error: "Unable to send magic link. Please try again later." },
        { status: 500 }
      )
    }

    // Check if email exists in auth.users
    const existingUser = authUsers.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    if (!existingUser) {
      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: "Unable to send magic link. Please contact your administrator." },
        { status: 400 }
      )
    }

    // User exists, send magic link using the regular client
    const supabase = await createClient()
    const { origin } = new URL(request.url)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
      },
    })

    if (otpError) {
      console.error("Error sending OTP:", otpError)
      return NextResponse.json(
        { error: "Unable to send magic link. Please try again later." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Magic link error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
