"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CreateTeamMemberDialog } from "@/components/dialogs/create-team-member-dialog"
import { AssignClientDialog } from "@/components/dialogs/assign-client-dialog"
import { TwoFactorDialog } from "@/components/dialogs/two-factor-dialog"
import { EditTeamMemberDialog } from "@/components/dialogs/edit-team-member-dialog"
import { Users, Plus, Search, Filter, Shield, UserPlus, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { HOST_URL } from "@/lib/api"

export default function TeamPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  useEffect(() => {
    fetchTeamMembers()
    
    // Handle URL parameters for client filtering
    const urlParams = new URLSearchParams(window.location.search)
    const clientId = urlParams.get('clientId')
    if (clientId) {
      // Set page title to indicate client-specific view
      document.title = `Team - Client View`
      console.log('Client filter requested:', clientId)
    }
  }, [user])

  const fetchTeamMembers = async () => {
    try {
      let response
      const urlParams = new URLSearchParams(window.location.search)
      const clientId = urlParams.get('clientId')
      
      if (user?.role === "admin") {
        // For admin, fetch both managers and team members in their domain
        let url = `${HOST_URL}/api/users/all-team-members?role=${user?.role}&userId=${user?.id}`
        if (clientId) {
          url += `&clientId=${clientId}`
        }
        response = await fetch(url)
      } else {
        // For other roles, fetch only team members
        response = await fetch(`${HOST_URL}/api/users/team-members?role=${user?.role}&userId=${user?.id}`)
      }
      const data = await response.json()
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setTeamMembers(data)
      } else {
        console.error('Expected array but got:', data)
        setTeamMembers([])
      }
    } catch (error) {
      console.error("Error fetching team members:", error)
      setTeamMembers([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = (Array.isArray(teamMembers) ? teamMembers : []).filter((member: any) => {
    return (
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedRole === "all" || member.role === selectedRole) &&
      (selectedStatus === "all" || member.status === selectedStatus)
    )
  })

  const canManageTeam = user?.role === "admin" || user?.role === "manager" || user?.role === "client"
  const canManage2FA = user?.role === "admin" || user?.role === "manager"

  const handleToggle2FA = (member: any) => {
    setSelectedMember(member)
    setShow2FADialog(true)
  }

  const handleAssignClient = (member: any) => {
    setSelectedMember(member)
    setShowAssignDialog(true)
  }

  const handleEditMember = (member: any) => {
    setSelectedMember(member)
    setShowEditDialog(true)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "manager":
        return "default"
      case "team_member":
        return "secondary"
      case "client":
        return "outline"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading team members...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full max-h-screen overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
                {(() => {
                  const urlParams = new URLSearchParams(window.location.search)
                  const clientId = urlParams.get('clientId')
                  if (clientId) return 'Team Members - Client View'
                  if (user?.role === 'manager') return 'My Team'
                  return 'Team Management'
                })()}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {(() => {
                  const urlParams = new URLSearchParams(window.location.search)
                  const clientId = urlParams.get('clientId')
                  if (clientId) return 'Team members who work on this client'
                  if (user?.role === 'manager') {
                    const count = Array.isArray(teamMembers) ? teamMembers.length : 0
                    return `Manage your team members and their assignments • ${count} team member${count !== 1 ? 's' : ''}`
                  }
                  return 'Manage team members and their assignments'
                })()}
              </p>
            </div>
            {canManageTeam && (
              <Button onClick={() => setShowCreateDialog(true)} size="lg" className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
                <Plus className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Add Team Member</span>
                <span className="sm:hidden">Add Member</span>
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-6">
            {/* Filters */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Filter className="mr-2 h-5 w-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search team members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>

                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => {
                      setSearchTerm("")
                      setSelectedRole("all")
                      setSelectedStatus("all")
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Team Members Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Team Members ({filteredMembers.length})
                </h2>
                {filteredMembers.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {searchTerm || selectedRole !== "all" || selectedStatus !== "all" 
                      ? "Filtered results" 
                      : "All team members"}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member: any) => (
                    <Card key={member.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4 mb-5">
                          <Avatar className="h-14 w-14 ring-2 ring-gray-100">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                              {member.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-gray-900 truncate">{member.name}</h3>
                            <p className="text-sm text-gray-600 truncate">{member.email}</p>
                            {member.phone && (
                              <p className="text-xs text-gray-500 mt-1">{member.phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Role</span>
                              <Badge variant={getRoleBadgeColor(member.role)} className="w-fit mt-1">
                                {member.role.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</span>
                              <Badge variant={member.status === "active" ? "default" : "secondary"} className="w-fit mt-1">
                                {member.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between py-2 border-t border-gray-100">
                            <span className="text-sm text-gray-600 font-medium">2FA Security</span>
                            <Badge variant={member.twoFactorEnabled ? "default" : "outline"}>
                              {member.twoFactorEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          
                          {member.clientNames && member.clientNames.length > 0 && (
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-sm text-gray-600 font-medium block mb-2">Assigned Clients</span>
                              <div className="flex flex-wrap gap-1">
                                {member.clientNames.slice(0, 2).map((clientName: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {clientName}
                                  </Badge>
                                ))}
                                {member.clientNames.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{member.clientNames.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {user?.role === 'manager' && member.managerId === user?.id && (
                            <div className="py-2 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 font-medium">Reports to</span>
                                <span className="text-sm font-semibold text-blue-600">You</span>
                              </div>
                            </div>
                          )}
                          
                          {member.managerName && member.managerId !== user?.id && (
                            <div className="py-2 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 font-medium">Manager</span>
                                <span className="text-sm font-medium text-gray-900">{member.managerName}</span>
                              </div>
                            </div>
                          )}
                          
                          {user?.role === 'manager' && (
                            <div className="py-2 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 font-medium">Direct Report</span>
                                <Badge variant={member.managerId === user?.id ? "default" : "outline"}>
                                  {member.managerId === user?.id ? "Yes" : "No"}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                          {canManage2FA && (
                            <Button size="sm" variant="outline" onClick={() => handleToggle2FA(member)} className="flex-1 min-w-[80px]">
                              <Shield className="mr-1 h-4 w-4" />
                              2FA
                            </Button>
                          )}
                          {canManageTeam && member.role === "team_member" && (
                            <Button size="sm" variant="outline" onClick={() => handleAssignClient(member)} className="flex-1 min-w-[80px]">
                              <UserPlus className="mr-1 h-4 w-4" />
                              Assign
                            </Button>
                          )}
                          {canManageTeam && (
                            <Button size="sm" variant="outline" onClick={() => handleEditMember(member)} className="flex-1 min-w-[80px]">
                              <Settings className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full">
                    <Card className="bg-gray-50 border-dashed border-2 border-gray-300">
                      <CardContent className="p-12 text-center">
                        <Users className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {user?.role === 'manager' ? "No team members in your team" : "No team members found"}
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          {searchTerm || selectedRole !== "all" || selectedStatus !== "all"
                            ? "No team members match your current filters. Try adjusting your search criteria."
                            : user?.role === 'manager' 
                              ? "You don't have any team members assigned to you yet. Ask your admin to assign team members to your management."
                              : "No team members have been added yet. Start building your team by adding the first member."}
                        </p>
                        {canManageTeam && (
                          <Button onClick={() => setShowCreateDialog(true)} size="lg">
                            <Plus className="mr-2 h-5 w-5" />
                            Add First Team Member
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Dialogs */}
      {canManageTeam && (
        <CreateTeamMemberDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={fetchTeamMembers}
        />
      )}

      {selectedMember && (
        <>
          <AssignClientDialog
            member={selectedMember}
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            onSuccess={fetchTeamMembers}
          />
          
          <TwoFactorDialog
            member={selectedMember}
            open={show2FADialog}
            onOpenChange={setShow2FADialog}
            onSuccess={fetchTeamMembers}
          />

          <EditTeamMemberDialog
            member={selectedMember}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSuccess={fetchTeamMembers}
          />
        </>
      )}
    </DashboardLayout>
  )
}
