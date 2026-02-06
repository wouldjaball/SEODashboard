"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to executive overview
    router.replace("/dashboard/executive")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">Redirecting to Executive Overview...</span>
      </div>
    </div>
  )
}