"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SuperAdminDashboard } from "@/components/dashboards/super-admin-dashboard"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"
import { ManagerDashboard } from "@/components/dashboards/manager-dashboard"
import { TeamMemberDashboard } from "@/components/dashboards/team-member-dashboard"
import { ClientDashboard } from "@/components/dashboards/client-dashboard"
import { FullPageLoader } from "@/components/ui/full-page-loader"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") ?? undefined

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return <FullPageLoader label="Loading your dashboard..." className="min-h-screen" />
  }

  if (!user) {
    return null
  }

  const renderDashboard = () => {
    switch (user.role) {
      case "super_admin":
        return <SuperAdminDashboard initialTab={tabParam as any} />
      case "admin":
        return <AdminDashboard />
      case "manager":
        return <ManagerDashboard />
      case "team_member":
        return <TeamMemberDashboard />
      case "client":
        return <ClientDashboard />
      default:
        return <div>Invalid role</div>
    }
  }

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>
}
