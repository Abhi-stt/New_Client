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
  const [selectedMember, setSelectedMember] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  useEffect(() => {
    fetchTeamMembers()
  }, [user])

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/users/team-members?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setTeamMembers(data)
    } catch (error) {
      console.error("Error fetching team members:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = teamMembers.filter((member: any) => {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600">Manage team members and their assignments</p>
          </div>
          {canManageTeam && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member: any) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-xs text-gray-500">{member.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Role:</span>
                      <Badge variant={getRoleBadgeColor(member.role)}>{member.role.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>{member.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">2FA:</span>
                      <Badge variant={member.twoFactorEnabled ? "default" : "outline"}>
                        {member.twoFactorEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    {member.assignedClients && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Clients:</span>
                        <span className="text-sm font-medium">{member.assignedClients}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {canManage2FA && (
                      <Button size="sm" variant="outline" onClick={() => handleToggle2FA(member)}>
                        <Shield className="mr-2 h-4 w-4" />
                        2FA
                      </Button>
                    )}
                    {canManageTeam && member.role === "team_member" && (
                      <Button size="sm" variant="outline" onClick={() => handleAssignClient(member)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || selectedRole !== "all" || selectedStatus !== "all"
                      ? "No team members match your current filters."
                      : "No team members have been added yet."}
                  </p>
                  {canManageTeam && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Team Member
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
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
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
