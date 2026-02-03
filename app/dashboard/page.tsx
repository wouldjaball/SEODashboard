"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect all users to executive dashboard as the main dashboard
    router.replace('/dashboard/executive')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}