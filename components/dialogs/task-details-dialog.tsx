"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { Calendar, User, Building, Clock, MessageSquare } from "lucide-react"
import { HOST_URL } from "@/lib/api"

interface TaskDetailsDialogProps {
  task: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TaskDetailsDialog({ task, open, onOpenChange, onSuccess }: TaskDetailsDialogProps) {
  const { user } = useAuth()
  const [comment, setComment] = useState("")
  const [status, setStatus] = useState(task?.status || "pending")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleStatusUpdate = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${HOST_URL}/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Task status updated" })
        onSuccess()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`${HOST_URL}/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, userId: user?.id }),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Comment added" })
        setComment("")
        onSuccess()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in_progress":
        return "secondary"
      case "pending":
        return "outline"
      case "overdue":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>Task details and progress tracking</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={getPriorityColor(task.priority)}>{task.priority} Priority</Badge>
                <Badge variant={getStatusColor(task.status)}>{task.status}</Badge>
                {task.recurrence && <Badge variant="outline">Recurring: {task.recurrence}</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Due: {task.dueDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span>Client: {task.clientName}</span>
              </div>
              {task.assigneeName && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Assigned to: {task.assigneeName}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Created: {task.createdAt}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            </div>
          </div>

          {/* Status Update */}
          <div className="space-y-2">
            <Label htmlFor="status">Update Status</Label>
            <div className="flex space-x-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleStatusUpdate} disabled={loading || status === task.status}>
                Update
              </Button>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              Comments
            </Label>

            {/* Existing Comments */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {task.comments?.map((comment: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{comment.userName}</span>
                    <span className="text-xs text-gray-500">{comment.createdAt}</span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.text}</p>
                </div>
              )) || <p className="text-sm text-gray-500 italic">No comments yet</p>}
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddComment} disabled={loading || !comment.trim()}>
                Add Comment
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
