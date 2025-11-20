"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Activity, UserPlus, Eye, EyeOff, Edit, Trash2, Search, Filter, Calendar, Presentation } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useFormValidation, validationRules } from "@/hooks/useFormValidation"
import { ValidationError, ValidationHint } from "@/components/ui/validation-error"

interface User {
  _id: string
  name: string
  email: string
  role: string
  phone?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

interface UserActivity {
  _id: string
  userId: {
    _id: string
    name: string
    email: string
    role: string
  }
  action: string
  description: string
  timestamp: string
  ipAddress?: string
}

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  todayActivities: number
  weeklyActivities: number
}

interface DemoRequest {
  _id: string
  name: string
  email: string
  phone: string
  company: string
  status: 'pending' | 'contacted' | 'completed' | 'cancelled'
  notes?: string
  contactedBy?: {
    _id: string
    name: string
    email: string
  }
  contactedAt?: string
  createdAt: string
  updatedAt: string
}

export function SuperAdminDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    todayActivities: 0,
    weeklyActivities: 0
  })
  const [users, setUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [demoStatusFilter, setDemoStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("users")

  // Initialize form validation
  const {
    formState,
    errors,
    isValid,
    setFieldValue,
    setFieldTouched,
    validateForm,
    resetForm,
    getFieldProps
  } = useFormValidation(
    {
      name: "",
      email: "",
      password: "",
      role: "client",
      phone: "",
    },
    validationRules.user
  )

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard stats
      const statsResponse = await fetch(`${api.superAdminDashboardStats}?userId=${user?.id}`)
      const statsData = await statsResponse.json()
      setStats(statsData.stats)
      setActivities(statsData.recentActivities || [])

      // Fetch all users
      const usersResponse = await fetch(`${api.superAdminUsers}?userId=${user?.id}`)
      const usersData = await usersResponse.json()
      setUsers(usersData)

      // Fetch demo requests
      const demoResponse = await fetch(`${api.superAdminDemoRequests}?userId=${user?.id}`)
      const demoData = await demoResponse.json()
      setDemoRequests(demoData.requests || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form before submission
    if (!validateForm()) {
      // Get the first error message to show specific guidance
      const firstError = Object.values(errors)[0]
      toast({
        title: "Please fix the form",
        description: firstError || "Please check all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      // Prepare user data from form state
      const userData = {
        name: formState.name.value,
        email: formState.email.value,
        password: formState.password.value,
        role: formState.role.value,
        phone: formState.phone.value
      }

      const response = await fetch(`${api.superAdminCreateUser}?userId=${user?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully"
        })
        setShowCreateUser(false)
        resetForm()
        fetchDashboardData()
      } else {
        const error = await response.json()
        // Show user-friendly error messages
        let errorMessage = "Failed to create user"
        
        if (error.error && error.error.includes("email")) {
          errorMessage = "This email is already in use. Please use a different email address."
        } else if (error.error && error.error.includes("role")) {
          errorMessage = "You don't have permission to create this type of user."
        } else if (error.details) {
          // Show the first validation error from server
          const firstError = Object.values(error.details)[0]
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
        }
        
        toast({
          title: "Cannot create user",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Please check your internet connection and try again",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    // Find the user to show their name in confirmation
    const userToDelete = users.find(u => u._id === userId)
    const userName = userToDelete ? `${userToDelete.name} (${userToDelete.email})` : 'this user'
    
    if (!confirm(`Are you sure you want to permanently delete ${userName}?\n\nThis action cannot be undone.`)) return

    setDeletingUserId(userId)
    try {
      const response = await fetch(`${api.superAdminDeleteUser(userId)}?userId=${user?.id}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast({
          title: "User Deleted",
          description: `${userName} has been permanently deleted`
        })
        fetchDashboardData()
      } else {
        const error = await response.json()
        // Show user-friendly error messages
        let errorMessage = "Failed to delete user"
        
        if (error.error && error.error.includes("own account")) {
          errorMessage = "You cannot delete your own account"
        } else if (error.error && error.error.includes("managing other users")) {
          errorMessage = "Cannot delete this user. They are managing other users. Please reassign them first."
        } else if (error.error && error.error.includes("not found")) {
          errorMessage = "User not found. They may have already been deleted."
        } else if (error.error) {
          errorMessage = error.error
        }
        
        toast({
          title: "Cannot Delete User",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Delete user error:', error)
      toast({
        title: "Connection Error",
        description: "Please check your internet connection and try again",
        variant: "destructive"
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  const filteredUsers = users
    .filter((user) => {
      return (
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      ) &&
      (roleFilter === "all" || user.role === roleFilter) &&
      (statusFilter === "all" || 
       (statusFilter === "active" && user.isActive) ||
       (statusFilter === "inactive" && !user.isActive))
    })
    .sort((a, b) => {
      // Sort by creation date, newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin": return "bg-red-100 text-red-800"
      case "admin": return "bg-purple-100 text-purple-800"
      case "manager": return "bg-blue-100 text-blue-800"
      case "team_member": return "bg-green-100 text-green-800"
      case "client": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin"
      case "admin": return "Admin"
      case "manager": return "Manager"
      case "team_member": return "Team Member"
      case "client": return "Client"
      default: return role
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "contacted": return "bg-blue-100 text-blue-800"
      case "completed": return "bg-green-100 text-green-800"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const handleUpdateDemoStatus = async (requestId: string, status: string) => {
    try {
      // Ensure we stay on demo-requests tab
      setActiveTab("demo-requests")
      
      const response = await fetch(`${api.superAdminUpdateDemoRequest(requestId)}?userId=${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Demo request status updated"
        })
        // Fetch only demo requests to avoid tab switch
        const demoResponse = await fetch(`${api.superAdminDemoRequests}?userId=${user?.id}`)
        const demoData = await demoResponse.json()
        setDemoRequests(demoData.requests || [])
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update status",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update demo request status",
        variant: "destructive"
      })
    }
  }

  const filteredDemoRequests = demoRequests.filter((request) => {
    return demoStatusFilter === "all" || request.status === demoStatusFilter
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Super Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-[#475569]">Manage all users and monitor system activities</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={() => window.location.href = '/tasks'} className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Manage Tasks</span>
            <span className="sm:hidden">Tasks</span>
          </Button>
          <Button onClick={() => setShowCreateUser(true)} className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
            <UserPlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Create User</span>
            <span className="sm:hidden">Add User</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">Deactivated accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activities</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.todayActivities}</div>
            <p className="text-xs text-muted-foreground">System activities</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Activities</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.weeklyActivities}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="activities">Activity Log</TabsTrigger>
          <TabsTrigger value="demo-requests">Request Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all system users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Users Table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setShowUserDetails(true)
                              }}
                              className="w-full sm:w-auto"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="ml-1 sm:hidden">View</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement edit user
                                toast({
                                  title: "Coming Soon",
                                  description: "Edit user functionality will be available soon"
                                })
                              }}
                              className="w-full sm:w-auto"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="ml-1 sm:hidden">Edit</span>
                            </Button>
                            {user._id !== user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={deletingUserId === user._id}
                                className="text-red-600 hover:text-red-700 disabled:opacity-50 w-full sm:w-auto"
                              >
                                {deletingUserId === user._id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                <span className="ml-1 sm:hidden">Delete</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Monitor user activities across the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{activity.userId.name}</div>
                            <div className="text-sm text-gray-500">{activity.userId.email}</div>
                            <Badge className={getRoleBadgeColor(activity.userId.role)}>
                              {getRoleDisplayName(activity.userId.role)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.action}</Badge>
                        </TableCell>
                        <TableCell>{activity.description}</TableCell>
                        <TableCell>
                          {new Date(activity.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo-requests" className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Demo Requests</CardTitle>
              <CardDescription>View and manage all demo requests from potential clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <Select value={demoStatusFilter} onValueChange={setDemoStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemoRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No demo requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDemoRequests.map((request) => (
                        <TableRow key={request._id}>
                          <TableCell className="font-medium">{request.name}</TableCell>
                          <TableCell>{request.email}</TableCell>
                          <TableCell>{request.phone}</TableCell>
                          <TableCell>{request.company}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(request.status)}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateDemoStatus(request._id, 'contacted')}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    Mark Contacted
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateDemoStatus(request._id, 'completed')}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    Mark Completed
                                  </Button>
                                </>
                              )}
                              {request.status === 'contacted' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateDemoStatus(request._id, 'completed')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Mark Completed
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with appropriate role and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formState.name.value}
                onChange={(e) => setFieldValue('name', e.target.value)}
                onBlur={() => setFieldTouched('name', true)}
                className={errors.name ? 'border-red-500' : ''}
              />
              <ValidationError error={errors.name} />
              <ValidationHint hint="Enter the user's full name (2-50 characters, letters only)" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formState.email.value}
                onChange={(e) => setFieldValue('email', e.target.value)}
                onBlur={() => setFieldTouched('email', true)}
                className={errors.email ? 'border-red-500' : ''}
              />
              <ValidationError error={errors.email} />
              <ValidationHint hint="Enter a valid email address" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formState.password.value}
                  onChange={(e) => setFieldValue('password', e.target.value)}
                  onBlur={() => setFieldTouched('password', true)}
                  className={errors.password ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <ValidationError error={errors.password} />
              <ValidationHint hint="Password must be 8+ characters with uppercase, lowercase, number, and special character (@$!%*?&)" />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formState.role.value} 
                onValueChange={(value) => setFieldValue('role', value)}
              >
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <ValidationError error={errors.role} />
              <ValidationHint hint="Select the appropriate role for the user" />
            </div>
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={formState.phone.value}
                onChange={(e) => setFieldValue('phone', e.target.value)}
                onBlur={() => setFieldTouched('phone', true)}
                className={errors.phone ? 'border-red-500' : ''}
                placeholder="+91-9876543210"
              />
              <ValidationError error={errors.phone} />
              <ValidationHint hint="Enter a valid 10-digit Indian mobile number (e.g., 9876543210)" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid}>
                {!isValid ? "Please fill all required fields" : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-600">{selectedUser.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <Badge className={getRoleBadgeColor(selectedUser.role)}>
                    {getRoleDisplayName(selectedUser.role)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-gray-600">{selectedUser.phone || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Login</Label>
                  <p className="text-sm text-gray-600">
                    {selectedUser.lastLoginAt 
                      ? new Date(selectedUser.lastLoginAt).toLocaleString()
                      : "Never"
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

