import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/dashboard/executive"

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // Check if user needs to change their password (first-time login)
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.user_metadata?.must_change_password) {
        return NextResponse.redirect(`${origin}/auth/change-password`)
      }

      // Redirect user to specified redirect URL or root of app
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
