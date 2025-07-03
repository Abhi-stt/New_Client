"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { HOST_URL } from "@/lib/api"

interface Client {
  id: string;
  name: string;
  email: string;
  // Add other fields as needed
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateTaskDialog({ open, onOpenChange, onSuccess }: CreateTaskDialogProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    assigneeId: "",
    priority: "medium",
    dueDate: "",
    isRecurring: false,
    recurrenceType: "",
    recurrenceInterval: 1,
  })
  const [clients, setClients] = useState<Client[]>([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      if (user?.role === "client") {
        fetchClientForUser()
      } else {
        fetchClients()
      }
      if (user?.role === "admin" || user?.role === "manager") {
        fetchTeamMembers()
      }
    }
  }, [open, user])

  const fetchClients = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/clients`)
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/users/team-members`)
      const data = await response.json()
      setTeamMembers(data)
    } catch (error) {
      console.error("Error fetching team members:", error)
    }
  }

  const fetchClientForUser = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/clients?role=client&userId=${user?.id}`)
      const data = await response.json()
      if (data.length > 0) {
        setClients(data)
        setFormData((prev) => ({ ...prev, clientId: data[0].id }))
      } else {
        // Fallback: set clientId to user.id
        setFormData((prev) => ({ ...prev, clientId: user?.id || "" }))
      }
    } catch (error) {
      setFormData((prev) => ({ ...prev, clientId: user?.id || "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Ensure clientId is set for client users
    let submitFormData = { ...formData }
    if (user?.role === "client") {
      // Only set clientId if user.id is a valid ObjectId
      if (/^[a-fA-F0-9]{24}$/.test(user?.id || "")) {
        submitFormData.clientId = user.id
      } else {
        submitFormData.clientId = ""
      }
    }
    // Ensure dueDate is set
    if (!submitFormData.dueDate) {
      submitFormData.dueDate = new Date().toISOString().slice(0, 10)
    }
    console.log("Submitting task formData:", submitFormData)

    try {
      // Create task
      const taskResponse = await fetch(`${HOST_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...submitFormData,
          createdBy: user?.id,
        }),
      })

      if (taskResponse.ok) {
        // Also create a calendar event for this task
        const eventData = {
          title: submitFormData.title,
          description: submitFormData.description,
          date: submitFormData.dueDate,
          priority: submitFormData.priority,
          clientId: submitFormData.clientId,
          assigneeId: submitFormData.assigneeId,
          type: 'task',
          createdBy: user?.id,
          isRecurring: submitFormData.isRecurring,
          recurrenceType: submitFormData.recurrenceType,
          recurrenceInterval: submitFormData.recurrenceInterval,
        }

        await fetch(`${HOST_URL}/api/calendar-events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        })

        toast({
          title: "Success",
          description: "Task and calendar event created successfully",
        })
        onSuccess()
        onOpenChange(false)
        setFormData({
          title: "",
          description: "",
          clientId: "",
          assigneeId: "",
          priority: "medium",
          dueDate: "",
          isRecurring: false,
          recurrenceType: "",
          recurrenceInterval: 1,
        })
      } else {
        const error = await taskResponse.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create task",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Create a new task and assign it to team members</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="col-span-3"
                placeholder="Task title"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Task description"
              />
            </div>

            {/* Client Selection */}
            {user?.role !== "client" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client" className="text-right">
                  Client
                </Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* If client, show their name as read-only */}
            {user?.role === "client" && clients.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Client</Label>
                <div className="col-span-3">
                  <Input value={clients[0].name} readOnly className="bg-gray-100" />
                </div>
              </div>
            )}

            {(user?.role === "admin" || user?.role === "manager") && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignee" className="text-right">
                  Assignee
                </Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member: any) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="col-span-3"
              />
            </div>

            {/* Recurring Task Options */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Recurring</Label>
              <div className="col-span-3 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked as boolean })}
                  />
                  <Label htmlFor="isRecurring">Make this a recurring task</Label>
                </div>

                {formData.isRecurring && (
                  <div className="space-y-2">
                    <Select
                      value={formData.recurrenceType}
                      onValueChange={(value) => setFormData({ ...formData, recurrenceType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Recurrence type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center space-x-2">
                      <Label htmlFor="interval">Every</Label>
                      <Input
                        id="interval"
                        type="number"
                        min="1"
                        value={formData.recurrenceInterval}
                        onChange={(e) =>
                          setFormData({ ...formData, recurrenceInterval: Number.parseInt(e.target.value) })
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">{formData.recurrenceType}(s)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
