"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SuperAdminDashboard } from "@/components/dashboards/super-admin-dashboard"
import { useAuth } from "@/components/auth-provider"
import { FullPageLoader } from "@/components/ui/full-page-loader"

export default function SuperAdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || user.role !== "super_admin")) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return <FullPageLoader label="Loading super admin dashboard..." className="min-h-screen" />
  }

  if (user.role !== "super_admin") {
    return null
  }

  return (
    <DashboardLayout>
      <SuperAdminDashboard />
    </DashboardLayout>
  )
}

