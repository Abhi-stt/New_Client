"use client"

import { useState, useEffect } from "react"
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
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/dashboard/manager?userId=${user?.id}`)
      const data = await response.json()
      setStats(data.stats)
      setTeamActivities(data.teamPerformance)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600">Manage your team and client assignments</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Assign Tasks
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Review Documents
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">Under your management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Clients</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedClients}</div>
            <p className="text-xs text-muted-foreground">Active clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">{stats.overdueItems} overdue</p>
          </CardContent>
        </Card>

        <Card>
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
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your team efficiently</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Users className="mr-2 h-4 w-4" />
              View Team Members
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <CheckSquare className="mr-2 h-4 w-4" />
              Assign New Task
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FileText className="mr-2 h-4 w-4" />
              Review Submissions
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Meeting
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
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <Badge variant="secondary">{activity.member}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No recent team activities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
