import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") ?? "google"
  const next = searchParams.get("next") ?? "/dashboard/executive"

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as "google" | "github",
    options: {
      redirectTo: `${new URL(request.url).origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ url: data.url })
}
