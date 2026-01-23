'use client'

import { useEffect } from 'react'
import { useCompany } from '@/lib/company-context'

export function PageTitle() {
  const { company } = useCompany()

  useEffect(() => {
    if (company?.name) {
      document.title = `${company.name} - Analytics Dashboard`
    }

    return () => {
      document.title = 'Analytics Dashboard'
    }
  }, [company?.name])

  return null
}
