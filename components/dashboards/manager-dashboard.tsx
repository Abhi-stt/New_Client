"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, FileText, CheckSquare, Calendar, Building } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { HOST_URL } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ManagerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    teamMembers: 0,
    assignedClients: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueItems: 0,
    teamPerformance: 0,
  })

  const [teamActivities, setTeamActivities] = useState([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
    if (user?.id) {
      fetch(`${HOST_URL}/api/users/${user.id}`)
        .then(res => res.json())
        .then(setProfile)
    }

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/dashboard/manager?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || stats) // Fallback to existing stats if no data
        setTeamActivities(data.teamPerformance || [])
      } else {
        console.error("Failed to fetch dashboard data:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* 2FA Code Card */}
      {profile?.twoFactorEnabled && (
        <Alert variant="default">
          <AlertDescription>
            <span className="font-semibold">Your 2FA Code:</span> <span className="font-mono text-lg">{profile.twoFactorCode}</span><br/>
            <span className="text-xs text-gray-500">This code is set by the admin. If it changes, use the new code for confidential document access.</span>
          </AlertDescription>
        </Alert>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Manager Dashboard</h1>
          <p className="text-sm sm:text-base text-[#475569]">Manage your team and client assignments</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={() => router.push('/tasks')} className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
            <CheckSquare className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Manage Tasks</span>
            <span className="sm:hidden">Tasks</span>
          </Button>
          <Button variant="outline" onClick={() => router.push('/documents')} className="w-full sm:w-auto border-slate-200 text-[#475569] hover:border-[#6366F1] hover:text-[#6366F1]">
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Review Documents</span>
            <span className="sm:hidden">Documents</span>
          </Button>
          <Button variant="outline" onClick={() => router.push('/team')} className="w-full sm:w-auto border-slate-200 text-[#475569] hover:border-[#6366F1] hover:text-[#6366F1]">
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">View Team</span>
            <span className="sm:hidden">Team</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">Under your management</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Clients</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedClients}</div>
            <p className="text-xs text-muted-foreground">Active clients</p>
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

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Overall team completion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Performance Score</span>
                <span className="text-sm text-muted-foreground">{stats.teamPerformance}%</span>
              </div>
              <Progress value={stats.teamPerformance} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your team efficiently</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-gradient-to-br hover:from-[#6366F1]/10 hover:to-[#A855F7]/10 border-[#6366F1]/20 hover:border-[#6366F1]/30 transition-colors"
              onClick={() => router.push('/team')}
            >
              <Users className="mr-2 h-4 w-4 text-[#6366F1]" />
              <span className="text-left">
                <div className="font-medium">View Team Members</div>
                <div className="text-xs text-gray-500">Manage {stats.teamMembers} team members</div>
              </span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-green-50 border-green-200 hover:border-green-300 transition-colors"
              onClick={() => router.push('/tasks')}
            >
              <CheckSquare className="mr-2 h-4 w-4 text-green-600" />
              <span className="text-left">
                <div className="font-medium">Manage Tasks</div>
                <div className="text-xs text-gray-500">{stats.pendingTasks} pending, {stats.overdueItems} overdue</div>
              </span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-orange-50 border-orange-200 hover:border-orange-300 transition-colors"
              onClick={() => router.push('/documents')}
            >
              <FileText className="mr-2 h-4 w-4 text-orange-600" />
              <span className="text-left">
                <div className="font-medium">Review Documents</div>
                <div className="text-xs text-gray-500">Check pending approvals</div>
              </span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-transparent hover:bg-purple-50 border-purple-200 hover:border-purple-300 transition-colors"
              onClick={() => router.push('/calendar')}
            >
              <Calendar className="mr-2 h-4 w-4 text-purple-600" />
              <span className="text-left">
                <div className="font-medium">Schedule Meeting</div>
                <div className="text-xs text-gray-500">View calendar & deadlines</div>
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Team Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Team Activities</CardTitle>
          <CardDescription>Recent activities from your team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamActivities.length > 0 ? (
              teamActivities.map((activity: any, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.description.includes('completed') ? 'bg-green-500' : 
                    activity.description.includes('pending') ? 'bg-yellow-500' : 
                    activity.description.includes('progress') ? 'bg-gradient-to-r from-[#6366F1] to-[#A855F7]' : 'bg-gray-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      {activity.client && activity.client !== 'Unknown' && (
                        <span className="text-xs text-gray-400">•</span>
                      )}
                      {activity.client && activity.client !== 'Unknown' && (
                        <p className="text-xs text-muted-foreground">Client: {activity.client}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{activity.member}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">No recent team activities</p>
                <p className="text-xs text-gray-400">Team activities will appear here as tasks are updated</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
