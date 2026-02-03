import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard/executive"
  const accessCode = searchParams.get("access_code")

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && sessionData?.user) {
      // Check if this is a new user (just signed up)
      const isNewUser = sessionData.user.created_at === sessionData.user.last_sign_in_at ||
        new Date(sessionData.user.created_at).getTime() > Date.now() - 60000 // Created within last minute

      if (isNewUser && accessCode) {
        // Validate the access code for new users
        const serviceClient = createServiceClient()

        const { data: codeData } = await serviceClient
          .from("access_codes")
          .select("id, is_active, usage_count")
          .eq("code", accessCode.toUpperCase())
          .eq("is_active", true)
          .single()

        if (!codeData) {
          // Invalid access code - delete the user and redirect to error
          // Note: We can't easily delete the user here, so redirect to error
          return NextResponse.redirect(`${origin}/auth/error?message=Invalid+access+code`)
        }

        // Increment usage count
        const currentCount = (codeData.usage_count as number) || 0
        await serviceClient
          .from("access_codes")
          .update({ usage_count: currentCount + 1 })
          .eq("id", codeData.id)
      }

      // Determine redirect destination
      let redirectPath = next

      // Check if user needs to change their password (temp password from invite)
      if (sessionData.user.user_metadata?.must_change_password) {
        redirectPath = "/auth/change-password"
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
