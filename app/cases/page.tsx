"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { CaseHearingManagement } from "@/components/cases/case-hearing-management"

export default function CasesPage() {
  return (
    <DashboardLayout>
      <CaseHearingManagement />
    </DashboardLayout>
  )
}

