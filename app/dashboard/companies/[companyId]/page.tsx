"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useCompany } from "@/lib/company-context"

interface CompanyDetailPageProps {
  params: {
    companyId: string
  }
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { setCompany, findCompanyById } = useCompany()
  const router = useRouter()

  useEffect(() => {
    // Find the company and set it in context, then redirect to owner dashboard
    const company = findCompanyById(params.companyId)
    if (company) {
      setCompany(company)
    }
    // Redirect to new owner dashboard
    router.replace("/dashboard/executive/owner")
  }, [params.companyId, findCompanyById, setCompany, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">Redirecting to Owner Dashboard...</span>
      </div>
    </div>
  )
}