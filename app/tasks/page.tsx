"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TaskManagement } from "@/components/task-management"

export default function TasksPage() {
  return (
    <DashboardLayout>
      <TaskManagement />
    </DashboardLayout>
  )
}