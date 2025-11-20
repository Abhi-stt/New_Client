"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, FileText, CheckSquare, Calendar, Building, MessageSquare } from "lucide-react"
import { CreateManagerDialog } from "@/components/dialogs/create-manager-dialog"
import { DocumentRequestDialog } from "@/components/dialogs/document-request-dialog"
import { HOST_URL } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"

export function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalDocuments: 0,
    pendingTasks: 0,
    overdueItems: 0,
    completionRate: 0,
  })

  const [recentActivities, setRecentActivities] = useState([])
  const [showCreateManager, setShowCreateManager] = useState(false)
  const [showDocumentRequest, setShowDocumentRequest] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`${HOST_URL}/api/dashboard/admin?userId=${user.id}`)
      const data = await response.json()
      setStats(data.stats)
      setRecentActivities(data.recentActivity)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-[#475569]">Manage your CA firm operations</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={() => window.location.href = '/tasks'} className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
            <CheckSquare className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Manage Tasks</span>
            <span className="sm:hidden">Tasks</span>
          </Button>
          <Button onClick={() => setShowCreateManager(true)} className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Create Manager</span>
            <span className="sm:hidden">Add Manager</span>
          </Button>
          <Button variant="outline" onClick={() => setShowDocumentRequest(true)} className="w-full sm:w-auto border-slate-200 text-[#475569] hover:border-[#6366F1] hover:text-[#6366F1]">
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Request Document</span>
            <span className="sm:hidden">Request Doc</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">+5 from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">+12 this week</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">{stats.overdueItems} overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Task Completion Rate</CardTitle>
            <CardDescription>Overall completion rate this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Completed</span>
                <span className="text-sm text-muted-foreground">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-white/50 border-slate-200 text-[#475569] hover:text-[#0F172A]"
              onClick={() => router.push('/team')}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Team Members
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-white/50 border-slate-200 text-[#475569] hover:text-[#0F172A]"
              onClick={() => router.push('/clients')}
            >
              <Building className="mr-2 h-4 w-4" />
              Client Management
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-white/50 border-slate-200 text-[#475569] hover:text-[#0F172A]"
              onClick={() => router.push('/queries')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              View Queries
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-white/50 border-slate-200 text-[#475569] hover:text-[#0F172A]"
              onClick={() => router.push('/tasks')}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Manage Tasks
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Latest system activities and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity: any, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-gradient-to-r from-[#6366F1] to-[#A855F7] rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <Badge variant="secondary">{activity.type}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No recent activities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateManagerDialog
        open={showCreateManager}
        onOpenChange={setShowCreateManager}
        onSuccess={fetchDashboardData}
      />
      <DocumentRequestDialog
        open={showDocumentRequest}
        onOpenChange={setShowDocumentRequest}
        onSuccess={fetchDashboardData}
      />
    </div>
  )
}
