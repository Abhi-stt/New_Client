"use client"

import { useMemo, useState } from "react"
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
import { User, Clock, MessageSquare, Tag } from "lucide-react"
import { HOST_URL } from "@/lib/api"

interface QueryDetailsDialogProps {
  query: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function QueryDetailsDialog({ query, open, onOpenChange, onSuccess }: QueryDetailsDialogProps) {
  const { user } = useAuth()
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState(query?.status || "pending")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const createdByRole = query?.createdByRole || "client"

  const canTakeAction = useMemo(() => {
    if (!user?.role) return false
    if (user.role === "super_admin") {
      return createdByRole === "admin"
    }
    if (user.role === "admin") {
      return ["manager", "team_member", "client"].includes(createdByRole)
    }
    return false
  }, [user?.role, createdByRole])

  const handleStatusUpdate = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${HOST_URL}/api/queries/${query.id}/status?role=${user?.role}&userId=${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Query status updated" })
        onSuccess()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update query", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddResponse = async () => {
    if (!response.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`${HOST_URL}/api/queries/${query.id}/responses?role=${user?.role}&userId=${user?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          userName: user?.name,
        }),
      })

      if (res.ok) {
        toast({ title: "Success", description: "Response added" })
        setResponse("")
        onSuccess()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add response", variant: "destructive" })
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
      case "resolved":
        return "default"
      case "in_progress":
        return "secondary"
      case "pending":
        return "outline"
      case "closed":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (!query) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{query.title}</DialogTitle>
          <DialogDescription>Query details and responses</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Query Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={getPriorityColor(query.priority)}>{query.priority} Priority</Badge>
                <Badge variant={getStatusColor(query.status)}>{query.status}</Badge>
                <Badge variant="outline">
                  <Tag className="mr-1 h-3 w-3" />
                  {query.category}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>Created by: {query.createdBy}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Created: {query.createdAt}</span>
              </div>
              {query.assignedTo && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Assigned to: {query.assignedTo}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span>Responses: {query.responseCount || 0}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded-lg">{query.description}</p>
            </div>
          </div>

          {/* Status Update (for CA team) */}
          {canTakeAction && (
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
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusUpdate} disabled={loading || status === query.status}>
                  Update
                </Button>
              </div>
            </div>
          )}

          {/* Responses */}
          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              Responses
            </Label>

            {/* Existing Responses */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {query.responses?.length ? (
                query.responses.map((resp: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {resp.userName} <span className="text-xs text-muted-foreground">({resp.userRole})</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {resp.createdAt ? new Date(resp.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{resp.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No responses yet</p>
              )}
            </div>

            {canTakeAction ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add your response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setResponse("")} disabled={loading}>
                    Clear
                  </Button>
                  <Button onClick={handleAddResponse} disabled={loading || !response.trim()}>
                    Add Response
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only Admins (for manager/team/client tickets) or Super Admins (for admin tickets) can send replies. You
                can view updates here as they arrive.
              </p>
            )}
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
