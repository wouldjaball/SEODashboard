import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Access code is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if code exists and is active
    const { data, error } = await supabase
      .from("access_codes")
      .select("id, code, is_active")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { valid: false, error: "Invalid access code" },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json(
      { valid: false, error: "Failed to validate code" },
      { status: 500 }
    )
  }
}

// Also handle incrementing usage after successful signup
export async function PUT(request: Request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Increment usage count
    const { error } = await supabase.rpc("increment_access_code_usage", {
      code_value: code.trim().toUpperCase(),
    })

    // If RPC doesn't exist, do it manually
    if (error) {
      await supabase
        .from("access_codes")
        .update({ usage_count: supabase.rpc("usage_count + 1") })
        .eq("code", code.trim().toUpperCase())
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update usage" }, { status: 500 })
  }
}
