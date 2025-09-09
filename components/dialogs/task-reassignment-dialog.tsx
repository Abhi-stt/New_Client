"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, ArrowRight, Calendar, Target, FileText } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  assigneeId: any
  createdBy: any
  clientId?: any
  serviceId?: any
  reassignedFrom?: any
  reassignedBy?: any
  reassignedAt?: string
  reassignmentHistory?: any[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface TaskReassignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onSuccess: () => void
}

export function TaskReassignmentDialog({ open, onOpenChange, task, onSuccess }: TaskReassignmentDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTeamMember, setSelectedTeamMember] = useState("")
  const [reason, setReason] = useState("")
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)

  useEffect(() => {
    if (open && user?.role === 'manager') {
      fetchTeamMembers()
    }
  }, [open, user])

  const fetchTeamMembers = async () => {
    try {
      setLoadingTeamMembers(true)
      console.log('🔍 Fetching assignable users for manager:', user?.id)
      // Use the assignable users endpoint to get team members and other assignable users
      const response = await fetch(`${api.assignableUsers}?role=${user?.role}&userId=${user?.id}`)
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📋 Assignable users data:', data)
        // Filter out the current user to prevent self-reassignment to same person
        const currentAssigneeId = task?.assigneeId?.id || task?.assigneeId?._id || task?.assigneeId
        setTeamMembers(data.filter((member: User) => member.id !== currentAssigneeId))
      } else {
        const errorText = await response.text()
        console.error('❌ Error response:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
    } catch (error) {
      console.error("Error fetching assignable users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch team members"
      })
    } finally {
      setLoadingTeamMembers(false)
    }
  }

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !selectedTeamMember) return

    try {
      setLoading(true)
      const response = await fetch(api.taskReassign(task.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newAssigneeId: selectedTeamMember,
          reason: reason,
          userId: user?.id
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Task reassigned successfully"
        })
        onOpenChange(false)
        setSelectedTeamMember("")
        setReason("")
        onSuccess()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to reassign task")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign task"
      })
    } finally {
      setLoading(false)
    }
  }

  const canReassign = user?.role === 'manager' &&
                     task?.status !== 'completed' && 
                     task?.status !== 'approved'

  // Debug logging
  console.log('🔍 Reassign permission check:', {
    userRole: user?.role,
    userId: user?.id,
    taskAssigneeId: task?.assigneeId?.id,
    taskAssigneeId2: task?.assigneeId?._id,
    taskAssigneeId3: task?.assigneeId,
    taskStatus: task?.status,
    canReassign: canReassign
  })

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reassign Task</DialogTitle>
          <DialogDescription>
            Delegate this task to one of your team members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.description && (
                <p className="text-gray-600">{task.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>
                    <span className="font-medium">Current Assignee:</span> {task.assigneeId?.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>
                    <span className="font-medium">Due:</span> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                {task.clientId && (
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span>
                      <span className="font-medium">Client:</span> {task.clientId.name}
                    </span>
                  </div>
                )}
                {task.serviceId && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>
                      <span className="font-medium">Service:</span> {task.serviceId.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Reassignment History */}
              {task.reassignmentHistory && task.reassignmentHistory.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Reassignment History</h4>
                  <div className="space-y-2">
                    {task.reassignmentHistory.map((record: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                        <span>{record.fromUserId?.name || 'Unknown'}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{record.toUserId?.name || 'Unknown'}</span>
                        <span className="text-gray-400">by {record.reassignedBy?.name || 'Unknown'}</span>
                        <span className="text-gray-400">
                          {new Date(record.reassignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permission Check */}
          {!canReassign && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <div className="h-2 w-2 bg-yellow-600 rounded-full"></div>
                  <span className="text-sm">
                    {task.status === 'completed' || task.status === 'approved'
                      ? "Cannot reassign completed or approved tasks"
                      : "You can only reassign tasks assigned to you"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reassignment Form */}
          {canReassign && (
            <form onSubmit={handleReassign} className="space-y-4">
              <div>
                <Label htmlFor="teamMember">Select Team Member</Label>
                <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTeamMembers ? (
                      <SelectItem value="loading" disabled>Loading team members...</SelectItem>
                    ) : teamMembers.length === 0 ? (
                      <SelectItem value="none" disabled>No team members found</SelectItem>
                    ) : (
                      teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason for Reassignment (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you're reassigning this task..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!selectedTeamMember || loading}
                >
                  {loading ? "Reassigning..." : "Reassign Task"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
