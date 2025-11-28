"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, FileText, CheckSquare, Calendar, Building, MessageSquare, Activity, Gavel, BellRing, AlertTriangle, PieChart, CalendarClock } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateManagerDialog } from "@/components/dialogs/create-manager-dialog"
import { DocumentRequestDialog } from "@/components/dialogs/document-request-dialog"
import { HOST_URL } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FINANCIAL_YEAR_OPTIONS = ["2025-26", "2024-25", "2023-24"]

const getCurrentFinancialYear = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const startYear = month >= 3 ? year : year - 1
  const endShort = (startYear + 1).toString().slice(-2)
  return `${startYear}-${endShort}`
}
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
  const [activityLogs, setActivityLogs] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [showCreateManager, setShowCreateManager] = useState(false)
  const [showDocumentRequest, setShowDocumentRequest] = useState(false)
  const [caseInsights, setCaseInsights] = useState({
    totals: { totalCases: 0, pendingCases: 0, submittedCases: 0, closedCases: 0 },
    todaysHearings: [],
    upcomingHearings: [],
    deadlines: [],
    replyDeadlines: [],
    noticeAlerts: [],
    submissionAlerts: [],
    clientCaseCounts: [],
  })
  const [loadingCaseInsights, setLoadingCaseInsights] = useState(false)
  const defaultFY = getCurrentFinancialYear()
  const [financialYear, setFinancialYear] = useState(defaultFY)
  const fyOptions = useMemo(() => {
    const unique = new Set([defaultFY, ...FINANCIAL_YEAR_OPTIONS])
    return Array.from(unique)
  }, [defaultFY])

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData(financialYear)
      fetchCaseInsights(financialYear)
    }
  }, [user, financialYear])

  const fetchDashboardData = async (fyParam = financialYear) => {
    if (!user?.id) return
    
    try {
      const params = new URLSearchParams({ userId: user.id })
      if (fyParam) {
        params.append("fy", fyParam)
      }
      const response = await fetch(`${HOST_URL}/api/dashboard/admin?${params.toString()}`)
      const data = await response.json()
      setStats(data.stats)
      setRecentActivities(data.recentActivity)
      fetchActivityLogs()
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  const fetchCaseInsights = async (fyParam = financialYear) => {
    if (!user?.id) return
    
    try {
      setLoadingCaseInsights(true)
      const params = new URLSearchParams({ role: user.role, userId: user.id })
      if (fyParam) {
        params.append("fy", fyParam)
      }
      const response = await fetch(`${HOST_URL}/api/cases/stats/overview?${params.toString()}`)
      const data = await response.json()
      setCaseInsights({
        totals: data?.totals || caseInsights.totals,
        todaysHearings: data?.todaysHearings || [],
        upcomingHearings: data?.upcomingHearings || [],
        deadlines: data?.deadlines || [],
        replyDeadlines: data?.replyDeadlines || [],
        noticeAlerts: data?.noticeAlerts || [],
        submissionAlerts: data?.submissionAlerts || [],
        clientCaseCounts: data?.clientCaseCounts || [],
      })
    } catch (error) {
      console.error("Error fetching case insights:", error)
    } finally {
      setLoadingCaseInsights(false)
    }
  }

  const fetchActivityLogs = async () => {
    if (!user?.id) return
    
    setLoadingActivities(true)
    try {
      const response = await fetch(`${HOST_URL}/api/dashboard/admin/activities?userId=${user.id}&limit=100`)
      const data = await response.json()
      setActivityLogs(data.activities || [])
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    } finally {
      setLoadingActivities(false)
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
        <div className="flex flex-col items-stretch sm:items-end space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground hidden sm:block">Financial Year</p>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fyOptions.map((fyOption) => (
                  <SelectItem key={fyOption} value={fyOption}>
                    {fyOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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

      {/* Case & Hearing Insights */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#6366F1]" />
            Case & Hearing Overview
          </CardTitle>
          <CardDescription>Departmental notices, hearings, and deadlines at a glance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingCaseInsights ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Total Cases</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{caseInsights.totals.totalCases}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{caseInsights.totals.pendingCases}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-bold text-emerald-600">{caseInsights.totals.submittedCases}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Closed</p>
                  <p className="text-2xl font-bold text-indigo-600">{caseInsights.totals.closedCases}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">Today’s Hearings</p>
                    <CalendarClock className="h-4 w-4 text-[#6366F1]" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {caseInsights.todaysHearings.length ? (
                      caseInsights.todaysHearings.slice(0, 4).map((hearing: any) => (
                        <div key={hearing._id || hearing.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{hearing.caseTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(hearing.hearingDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                              {hearing.hearingType}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {hearing.outcome?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No hearings scheduled today.</p>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">Upcoming (7 days)</p>
                    <Calendar className="h-4 w-4 text-[#A855F7]" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {caseInsights.upcomingHearings.length ? (
                      caseInsights.upcomingHearings.slice(0, 4).map((hearing: any) => (
                        <div key={hearing._id || hearing.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{hearing.caseTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(hearing.hearingDate).toLocaleDateString()} • {hearing.officerName || "Officer TBD"}
                            </p>
                          </div>
                          <Badge variant="secondary">{hearing.hearingType}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No hearings due in the next week.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">Deadlines & Reply Due Dates</p>
                    <BellRing className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {caseInsights.deadlines.length || caseInsights.replyDeadlines.length ? (
                      <>
                        {caseInsights.deadlines.slice(0, 3).map((item: any) => (
                          <div key={`deadline-${item._id || item.id}`} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{item.caseTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                Submission • {new Date(item.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline">Due</Badge>
                          </div>
                        ))}
                        {caseInsights.replyDeadlines.slice(0, 3).map((item: any) => (
                          <div key={`reply-${item._id || item.id}`} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{item.caseTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                Reply • {new Date(item.replyDueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[#A855F7] border-[#F3E8FF]">
                              Reply
                            </Badge>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No deadlines due.</p>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">Notice & Submission Alerts</p>
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {caseInsights.noticeAlerts.length || caseInsights.submissionAlerts.length ? (
                      <>
                        {caseInsights.noticeAlerts.slice(0, 3).map((item: any) => (
                          <div key={`notice-${item._id || item.id}`} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{item.caseTitle}</p>
                              <p className="text-xs text-muted-foreground">Notice pending</p>
                            </div>
                            <Badge variant="destructive">Notice</Badge>
                          </div>
                        ))}
                        {caseInsights.submissionAlerts.slice(0, 3).map((item: any) => (
                          <div key={`submission-${item._id || item.id}`} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{item.caseTitle}</p>
                              <p className="text-xs text-muted-foreground">Submission alert</p>
                            </div>
                            <Badge variant="secondary">Submission</Badge>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No notice alerts pending.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">Client-wise case counts</p>
                  <PieChart className="h-4 w-4 text-slate-500" />
                </div>
                {caseInsights.clientCaseCounts.length ? (
                  <div className="space-y-2">
                    {caseInsights.clientCaseCounts.map((client: any) => (
                      <div key={client.clientName} className="flex items-center justify-between">
                        <p className="text-sm">{client.clientName || "Unassigned"}</p>
                        <Badge variant="outline">{client.total} cases</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No client level data available.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                    <p className="text-sm font-medium">{activity.description || activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp || activity.time}</p>
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

      {/* Activity Logs Section */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#6366F1]" />
                Activity Logs
              </CardTitle>
              <CardDescription>All activities performed by managers, team members, and clients in your portal</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1] mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading activities...</p>
            </div>
          ) : activityLogs.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((activity: any) => (
                    <TableRow key={activity._id || activity.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{activity.userId?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{activity.userId?.email || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {activity.userId?.role === 'manager' ? 'Manager' :
                           activity.userId?.role === 'team_member' ? 'Team Member' :
                           activity.userId?.role === 'client' ? 'Client' :
                           activity.userId?.role || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{activity.action || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm truncate">{activity.description || 'No description'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600">
                          {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'N/A'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No activity logs found</p>
            </div>
          )}
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
