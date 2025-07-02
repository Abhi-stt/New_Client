"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"
import { ManagerDashboard } from "@/components/dashboards/manager-dashboard"
import { TeamMemberDashboard } from "@/components/dashboards/team-member-dashboard"
import { ClientDashboard } from "@/components/dashboards/client-dashboard"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  const renderDashboard = () => {
    switch (user.role) {
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
