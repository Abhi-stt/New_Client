"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Building, Users, Calendar, MessageSquare, Upload, AlertTriangle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { HOST_URL } from "@/lib/api"

export function ClientDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalFirms: 0,
    totalDocuments: 0,
    pendingRequests: 0,
    completedTasks: 0,
    teamMembers: 0,
    complianceRate: 0,
  })

  const [recentDocuments, setRecentDocuments] = useState([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/dashboard/client?userId=${user?.id}`)
      const data = await response.json()
      setStats(data.stats)
      setRecentDocuments(data.documents)
      setUpcomingDeadlines(data.deadlines)
      setPendingRequests(data.requests)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
          <p className="text-gray-600">Manage your firms and compliance requirements</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
          <Button variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask Query
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Firms</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFirms}</div>
            <p className="text-xs text-muted-foreground">Active firms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Total uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">In your organization</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
            <CardDescription>Overall compliance rate across all firms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Compliance Rate</span>
                <span className="text-sm text-muted-foreground">{stats.complianceRate}%</span>
              </div>
              <Progress value={stats.complianceRate} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Building className="mr-2 h-4 w-4" />
              Manage Firms
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Users className="mr-2 h-4 w-4" />
              Team Management
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FileText className="mr-2 h-4 w-4" />
              View Documents
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Calendar className="mr-2 h-4 w-4" />
              Compliance Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Document Requests</CardTitle>
          <CardDescription>Documents requested by your CA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request: any, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{request.documentName}</h4>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {request.dueDate} | Requested by: {request.requestedBy}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={request.priority === "high" ? "destructive" : "default"}>{request.priority}</Badge>
                    <Button size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No pending document requests</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Important compliance deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((deadline: any, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{deadline.title}</h4>
                    <p className="text-sm text-muted-foreground">{deadline.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Firm: {deadline.firmName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={deadline.urgency === "high" ? "destructive" : "default"}>{deadline.dueDate}</Badge>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
