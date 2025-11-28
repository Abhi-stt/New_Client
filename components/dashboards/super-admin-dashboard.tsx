"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Activity, UserPlus, Eye, EyeOff, Edit, Trash2, Search, Calendar, RefreshCw, Building2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useFormValidation, validationRules } from "@/hooks/useFormValidation"
import { ValidationError, ValidationHint } from "@/components/ui/validation-error"
import { FullPageLoader } from "@/components/ui/full-page-loader"
import { Textarea } from "@/components/ui/textarea"

interface User {
  _id: string
  name: string
  email: string
  role: string
  phone?: string
  managerId?: string
  clientIds?: string[]
  firmIds?: string[]
  twoFactorEnabled?: boolean
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

type DemoStatus =
  | 'pending'
  | 'contacted'
  | 'follow_up_1'
  | 'follow_up_2'
  | 'follow_up_3'
  | 'completed'
  | 'purchased'
  | 'declined'
  | 'not_interested'
  | 'cancelled'

type RoleView = 'admin' | 'manager' | 'team_member' | 'client'
type SuperAdminTab = 'users' | 'clients' | 'activities' | 'demo-requests' | 'role-access'

interface DemoRequest {
  _id: string
  name: string
  email: string
  phone: string
  company: string
  status: DemoStatus
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

interface ClientRecord {
  _id: string
  id?: string
  name: string
  email: string
  phone?: string
  address?: string
  status: string
  type?: string
  createdAt?: string
  updatedAt?: string
}

const defaultClientFormState = {
  companyName: "",
  email: "",
  phone: "",
  address: "",
  status: "active",
}

const roleViewLabels: Record<RoleView, string> = {
  admin: "Admin",
  manager: "Manager",
  team_member: "Team Member",
  client: "Client",
}

const toRoleView = (role: string): RoleView | null => {
  switch (role) {
    case "admin":
    case "manager":
    case "team_member":
    case "client":
      return role
    default:
      return null
  }
}

interface SuperAdminDashboardProps {
  initialTab?: SuperAdminTab
}

export function SuperAdminDashboard({ initialTab = "users" }: SuperAdminDashboardProps) {
  const { user: authUser, baseUser, setViewAsRole, setViewAsUser } = useAuth()
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
  const [updatingDemoId, setUpdatingDemoId] = useState<string | null>(null)
  const resolvedInitialTab: SuperAdminTab = (["users","clients","activities","demo-requests","role-access"].includes(initialTab)
    ? initialTab
    : "users") as SuperAdminTab

  const [activeTab, setActiveTab] = useState<SuperAdminTab>(resolvedInitialTab)

  useEffect(() => {
    setActiveTab(resolvedInitialTab)
  }, [resolvedInitialTab])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [clientStatusFilter, setClientStatusFilter] = useState("all")
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [clientForm, setClientForm] = useState({ ...defaultClientFormState })
  const [creatingClient, setCreatingClient] = useState(false)
  const [clientsRefreshing, setClientsRefreshing] = useState(false)
  const [subscriptionUpdatingId, setSubscriptionUpdatingId] = useState<string | null>(null)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [resettingClientId, setResettingClientId] = useState<string | null>(null)
  const [activitySearchTerm, setActivitySearchTerm] = useState("")
  const canImpersonate = baseUser?.role === "super_admin"
  const groupedUsersByRole = useMemo(() => {
    const base: Record<RoleView, User[]> = {
      admin: [],
      manager: [],
      team_member: [],
      client: []
    }

    users.forEach((userRecord) => {
      const normalizedRole = toRoleView(userRecord.role)
      if (normalizedRole) {
        base[normalizedRole].push(userRecord)
      }
    })

    return base
  }, [users])

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

  const fetchClients = useCallback(async (showSpinner = false) => {
    if (!authUser?.id) return

    try {
      if (showSpinner) setClientsRefreshing(true)

      const response = await fetch(`${api.clients}?role=super_admin&userId=${authUser.id}`)
      const data = await response.json()
      setClients(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast({
        title: "Client data unavailable",
        description: "Unable to load clients right now. Please retry.",
        variant: "destructive"
      })
    } finally {
      if (showSpinner) setClientsRefreshing(false)
    }
  }, [authUser?.id, toast])

  const fetchDashboardData = useCallback(async () => {
    if (!authUser?.id) return
    try {
      setLoading(true)
      
      const statsResponse = await fetch(`${api.superAdminDashboardStats}?userId=${authUser.id}`)
      const statsData = await statsResponse.json()
      setStats(statsData.stats)
      setActivities(statsData.recentActivities || [])

      const [usersResponse, demoResponse] = await Promise.all([
        fetch(`${api.superAdminUsers}?userId=${authUser.id}`),
        fetch(`${api.superAdminDemoRequests}?userId=${authUser.id}`)
      ])

      const usersData = await usersResponse.json()
      const demoData = await demoResponse.json()
      setUsers(usersData)
      setDemoRequests(demoData.requests || [])

      await fetchClients()
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
  }, [authUser?.id, fetchClients, toast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

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

    if (!authUser?.id) {
      toast({
        title: "Session expired",
        description: "Please sign in again to continue.",
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

      const response = await fetch(`${api.superAdminCreateUser}?userId=${authUser.id}`, {
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

    if (!authUser?.id) {
      toast({
        title: "Session expired",
        description: "Please sign in again before performing user actions.",
        variant: "destructive"
      })
      return
    }

    setDeletingUserId(userId)
    try {
      const response = await fetch(`${api.superAdminDeleteUser(userId)}?userId=${authUser.id}`, {
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

  const handleResetUserCredentials = async (targetUserId: string) => {
    if (!authUser?.id) {
      toast({
        title: "Session expired",
        description: "Please sign in again to continue.",
        variant: "destructive"
      })
      return
    }

    setResettingUserId(targetUserId)
    try {
      const response = await fetch(`${api.superAdminResetUserCredentials(targetUserId)}?userId=${authUser.id}`, {
        method: "POST"
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Credentials reset",
          description: `Temporary password: ${data.tempPassword}`,
        })
      } else {
        toast({
          title: "Unable to reset credentials",
          description: data.error || "Something went wrong. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to reset credentials right now.",
        variant: "destructive"
      })
    } finally {
      setResettingUserId(null)
    }
  }

  const handleCreateClient = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!authUser?.id) {
      toast({
        title: "Session expired",
        description: "Please sign in again to continue.",
        variant: "destructive"
      })
      return
    }

    if (!clientForm.companyName.trim() || !clientForm.email.trim()) {
      toast({
        title: "Missing fields",
        description: "Company name and email are required.",
        variant: "destructive"
      })
      return
    }

    setCreatingClient(true)
    try {
      const payload = {
        name: clientForm.companyName.trim(),
        email: clientForm.email.trim(),
        phone: clientForm.phone.trim() || undefined,
        address: clientForm.address.trim() || undefined,
        type: "company",
        status: clientForm.status,
      }

      const response = await fetch(`${api.clients}?role=super_admin&userId=${authUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Client created",
          description: `${clientForm.companyName} has been added`,
        })
        setShowCreateClient(false)
        setClientForm({ ...defaultClientFormState })
        await fetchClients(true)
      } else {
        toast({
          title: "Unable to create client",
          description: data.error || "Please verify the details and try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to create client right now.",
        variant: "destructive"
      })
    } finally {
      setCreatingClient(false)
    }
  }

  const handleUpdateClientSubscription = async (clientId: string, status: string) => {
    if (!authUser?.id) {
      toast({
        title: "Session expired",
        description: "Please sign in again to continue.",
        variant: "destructive"
      })
      return
    }

    setSubscriptionUpdatingId(clientId)
    try {
      const response = await fetch(`${api.clients}/${clientId}?role=super_admin&userId=${authUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Subscription updated",
          description: `Client status set to ${status}`,
        })
        await fetchClients()
      } else {
        toast({
          title: "Update failed",
          description: data.error || "Could not update subscription status.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to update subscription right now.",
        variant: "destructive"
      })
    } finally {
      setSubscriptionUpdatingId(null)
    }
  }

  const handleResetClientCredentials = async (clientId: string) => {
    if (!authUser?.id) {
      toast({
        title: "Session expired",
        description: "Please sign in again to continue.",
        variant: "destructive"
      })
      return
    }

    setResettingClientId(clientId)
    try {
      const response = await fetch(`${api.superAdminResetClientCredentials(clientId)}?userId=${authUser.id}`, {
        method: "POST"
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Client credentials reset",
          description: `Temporary password: ${data.tempPassword}`,
        })
      } else {
        toast({
          title: "Unable to reset client credentials",
          description: data.error || "Please try again later.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to reset client credentials right now.",
        variant: "destructive"
      })
    } finally {
      setResettingClientId(null)
    }
  }

  const handleRefreshClients = () => {
    fetchClients(true)
  }

  const handleViewAsRoleSwitch = (role: RoleView) => {
    if (!canImpersonate) return
    setViewAsUser(null)
    setViewAsRole(role)
    toast({
      title: `Viewing ${roleViewLabels[role]} workspace`,
      description: "Use the sidebar to explore their full experience. Return anytime from the top bar.",
    })
  }

  const handleReturnToSuperAdminView = () => {
    if (!canImpersonate) return
    setViewAsRole(null)
    setViewAsUser(null)
    toast({
      title: "Super Admin view restored",
      description: "You are back in the consolidated super admin dashboard.",
    })
  }

  const handleViewAsSpecificUser = (targetUser: User) => {
    if (!canImpersonate) return
    const normalizedRole = toRoleView(targetUser.role)
    if (!normalizedRole) return
    setViewAsRole(null)
    setViewAsUser({
      id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: normalizedRole,
      phone: targetUser.phone,
      managerId: targetUser.managerId,
      clientIds: targetUser.clientIds,
      firmIds: targetUser.firmIds,
      twoFactorEnabled: targetUser.twoFactorEnabled ?? false,
    })
    toast({
      title: `Viewing as ${targetUser.name}`,
      description: `Navigation and data now reflect this ${roleViewLabels[normalizedRole]} account.`,
    })
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

  const filteredClients = clients
    .filter((client) => {
      const search = clientSearchTerm.toLowerCase()
      const matchesSearch =
        !search ||
        client.name?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.address?.toLowerCase().includes(search)

      const normalizedStatus = (client.status || "").toLowerCase()
      const matchesStatus =
        clientStatusFilter === "all" || normalizedStatus === clientStatusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime()
    })

  const filteredActivities = activities.filter((activity) => {
    if (!activitySearchTerm) return true
    const search = activitySearchTerm.toLowerCase()
    return (
      activity.userId.name.toLowerCase().includes(search) ||
      activity.userId.email.toLowerCase().includes(search) ||
      activity.action.toLowerCase().includes(search) ||
      activity.description.toLowerCase().includes(search)
    )
  })

  const clientStatusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" },
  ]

  const demoStatusOptions: { value: DemoStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "contacted", label: "Contacted" },
    { value: "follow_up_1", label: "Follow Up 1" },
    { value: "follow_up_2", label: "Follow Up 2" },
    { value: "follow_up_3", label: "Follow Up 3" },
    { value: "purchased", label: "Purchased" },
    { value: "completed", label: "Completed" },
    { value: "declined", label: "Declined" },
    { value: "not_interested", label: "Not Interested" },
    { value: "cancelled", label: "Cancelled" },
  ]

  const roleAccessOptions: { role: RoleView; description: string; highlights: string[] }[] = [
    {
      role: "admin",
      description: "Oversee clients, documents, and high-level compliance metrics exactly as an Admin would.",
      highlights: [
        "Full client management and onboarding",
        "Document approvals and compliance dashboards",
        "Query handling and escalation tools",
      ],
    },
    {
      role: "manager",
      description: "Coordinate teams and assignments, monitor workloads, and manage client delivery timelines.",
      highlights: [
        "Team scheduling and workload planning",
        "Client assignment insights",
        "Document and calendar access",
      ],
    },
    {
      role: "team_member",
      description: "Experience the individual contributor view for reviewing tasks, uploads, and deadlines.",
      highlights: [
        "Personal task board and performance metrics",
        "Document upload and review flows",
        "Calendar and meeting coordination",
      ],
    },
    {
      role: "client",
      description: "Preview the client-facing workspace to ensure sharing, approvals, and support are seamless.",
      highlights: [
        "Shared document tracking",
        "Compliance progress visibility",
        "Direct query and support touchpoints",
      ],
    },
  ]

  const formatStatusLabel = (status: string) =>
    status
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin": return "bg-red-100 text-red-800"
      case "admin": return "bg-purple-100 text-purple-800"
      case "manager": return "bg-gradient-to-br from-[#6366F1]/10 to-[#A855F7]/10 text-[#6366F1]"
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
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-gray-200 text-gray-700"
      case "suspended": return "bg-orange-200 text-orange-900"
      case "contacted": return "bg-gradient-to-br from-[#6366F1]/10 to-[#A855F7]/10 text-[#6366F1]"
      case "follow_up_1":
      case "follow_up_2":
      case "follow_up_3":
        return "bg-orange-100 text-orange-800"
      case "completed": return "bg-green-100 text-green-800"
      case "purchased": return "bg-emerald-100 text-emerald-800"
      case "declined": return "bg-red-100 text-red-800"
      case "not_interested": return "bg-gray-200 text-gray-700"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const handleUpdateDemoStatus = async (requestId: string, status: DemoStatus) => {
    if (!authUser?.id) {
      toast({
        title: "Session expired",
        description: "Please sign in again before updating demo requests.",
        variant: "destructive"
      })
      return
    }

    setUpdatingDemoId(requestId)

    try {
      // Ensure we stay on demo-requests tab
      setActiveTab("demo-requests")
      
      const response = await fetch(`${api.superAdminUpdateDemoRequest(requestId)}?userId=${authUser.id}`, {
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
        const demoResponse = await fetch(`${api.superAdminDemoRequests}?userId=${authUser.id}`)
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
    } finally {
      setUpdatingDemoId(null)
    }
  }

  const filteredDemoRequests = demoRequests.filter((request) => {
    return demoStatusFilter === "all" || request.status === demoStatusFilter
  })

  if (loading) {
    return <FullPageLoader label="Preparing super admin insights..." className="min-h-screen" />
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
            <Activity className="h-4 w-4 text-[#6366F1]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">{stats.todayActivities}</div>
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
          <TabsTrigger value="clients">Client Management</TabsTrigger>
          <TabsTrigger value="activities">Activity Log</TabsTrigger>
          <TabsTrigger value="demo-requests">Request Demo</TabsTrigger>
          <TabsTrigger value="role-access">Role Access</TabsTrigger>
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
                    {filteredUsers.map((systemUser) => (
                      <TableRow key={systemUser._id}>
                        <TableCell className="font-medium">{systemUser.name}</TableCell>
                        <TableCell>{systemUser.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(systemUser.role)}>
                            {getRoleDisplayName(systemUser.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={systemUser.isActive ? "default" : "secondary"}>
                            {systemUser.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(systemUser.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {systemUser.lastLoginAt 
                            ? new Date(systemUser.lastLoginAt).toLocaleDateString()
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(systemUser)
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetUserCredentials(systemUser._id)}
                              disabled={resettingUserId === systemUser._id}
                              className="w-full sm:w-auto"
                            >
                              <RefreshCw className={`h-4 w-4 ${resettingUserId === systemUser._id ? "animate-spin" : ""}`} />
                              <span className="ml-1 sm:hidden">Reset</span>
                            </Button>
                            {systemUser._id !== authUser?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(systemUser._id)}
                                disabled={deletingUserId === systemUser._id}
                                className="text-red-600 hover:text-red-700 disabled:opacity-50 w-full sm:w-auto"
                              >
                                {deletingUserId === systemUser._id ? (
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

        <TabsContent value="clients" className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Client Management</CardTitle>
                <CardDescription>Oversee client records, subscriptions, and access</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowCreateClient(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  New Client
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefreshClients}
                  disabled={clientsRefreshing}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${clientsRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search clients..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {clientStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No clients found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client) => {
                        const clientId = client._id || client.id || client.email
                        return (
                          <TableRow key={clientId}>
                            <TableCell className="font-medium">{client.name || "Unnamed client"}</TableCell>
                            <TableCell>{client.email}</TableCell>
                            <TableCell>{client.phone || "—"}</TableCell>
                            <TableCell className="max-w-xs">
                              <p className="truncate text-sm text-muted-foreground">
                                {client.address || "No address on file"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeColor(client.status || "pending")}>
                                {formatStatusLabel(client.status || "pending")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-2">
                                <Select
                                  value={(client.status || "active").toLowerCase()}
                                  onValueChange={(value) => handleUpdateClientSubscription(clientId, value)}
                                  disabled={subscriptionUpdatingId === clientId}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Manage subscription" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {clientStatusOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  onClick={() => handleResetClientCredentials(clientId)}
                                  disabled={resettingClientId === clientId}
                                >
                                  <RefreshCw className={`mr-2 h-4 w-4 ${resettingClientId === clientId ? "animate-spin" : ""}`} />
                                  Reset Credentials
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
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
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search activities..."
                    value={activitySearchTerm}
                    onChange={(e) => setActivitySearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
                    {filteredActivities.map((activity) => (
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
                      {demoStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                              {formatStatusLabel(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Select
                                value={request.status}
                                onValueChange={(value) => handleUpdateDemoStatus(request._id, value as DemoStatus)}
                                disabled={updatingDemoId === request._id}
                              >
                                <SelectTrigger className="w-full sm:w-60">
                                  <SelectValue placeholder="Update status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {demoStatusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {request.notes && (
                                <p className="text-xs text-muted-foreground">
                                  Notes: {request.notes}
                                </p>
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

        <TabsContent value="role-access" className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Role Access Control</CardTitle>
              <CardDescription>Instantly switch into any persona to audit their full experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Launch the exact dashboard that Admins, Managers, Team Members, or Clients see. Navigation and permissions
                will adapt to the selected persona until you return to the Super Admin view.
              </p>
              <p className="text-xs text-[#6366F1]">
                Tip: Once you switch, use the sidebar links to open any page you want to inspect. Click &ldquo;Return to Super Admin&rdquo;
                in the header to come back here anytime.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleReturnToSuperAdminView}
                disabled={!canImpersonate}
                className="w-full sm:w-auto"
              >
                Return to Super Admin
              </Button>
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleAccessOptions.map((option) => (
              <Card key={option.role} className="bg-white/80 backdrop-blur-sm flex flex-col">
                <CardHeader>
                  <CardTitle>{roleViewLabels[option.role]} Portal</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {option.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Available {roleViewLabels[option.role]}s
                    </p>
                    {groupedUsersByRole[option.role]?.length ? (
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupedUsersByRole[option.role].map((roleUser) => (
                              <TableRow key={roleUser._id}>
                                <TableCell className="font-medium">{roleUser.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{roleUser.email}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewAsSpecificUser(roleUser)}
                                  >
                                    View as
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No {roleViewLabels[option.role]}s created yet.
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                  <Button
                    className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
                    onClick={() => handleViewAsRoleSwitch(option.role)}
                    disabled={!canImpersonate}
                  >
                    View {roleViewLabels[option.role]} Portal
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
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
              <Button type="submit" disabled={!isValid} className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
                {!isValid ? "Please fill all required fields" : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog
        open={showCreateClient}
        onOpenChange={(open) => {
          setShowCreateClient(open)
          if (!open) {
            setClientForm({ ...defaultClientFormState })
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Capture high-level client information to initiate onboarding.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={clientForm.companyName}
                onChange={(e) => setClientForm((prev) => ({ ...prev, companyName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                value={clientForm.phone}
                onChange={(e) => setClientForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91-9876543210"
              />
            </div>
            <div>
              <Label htmlFor="clientAddress">Address</Label>
              <Textarea
                id="clientAddress"
                rows={3}
                value={clientForm.address}
                onChange={(e) => setClientForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street, City, State"
              />
            </div>
            <div>
              <Label htmlFor="clientStatus">Subscription Status</Label>
              <Select
                value={clientForm.status}
                onValueChange={(value) => setClientForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="clientStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {clientStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateClient(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingClient}
                className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
              >
                {creatingClient ? "Creating..." : "Create Client"}
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

