"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, User, Target, Clock } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

interface TaskCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  clientId?: string
  serviceId?: string
  preSelectedAssignee?: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Client {
  id: string
  name: string
  email: string
}

interface Service {
  id: string
  name: string
  category: string
}

export function TaskCreationDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  clientId, 
  serviceId, 
  preSelectedAssignee 
}: TaskCreationDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // For managers, default to "other" tab to assign to team members
  // For other roles, default to "self"
  const [activeTab, setActiveTab] = useState(user?.role === "manager" ? "other" : "self")
  const [loading, setLoading] = useState(false)
  
  // Form data
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    estimatedHours: "",
    assigneeId: "",
    clientId: clientId || "none",
    serviceId: serviceId || "none",
    tags: "",
    isRecurring: false,
    recurrenceType: "none",
    recurrenceInterval: 1,
    recurrenceEndDate: "",
    recurrenceCount: ""
  })
  
  // Data for dropdowns
  const [assignableUsers, setAssignableUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
    if (open) {
      fetchData()
      // Set pre-selected assignee if provided
      if (preSelectedAssignee) {
        setTaskForm(prev => ({ ...prev, assigneeId: preSelectedAssignee }))
        setActiveTab("other")
      }
    }
  }, [open, preSelectedAssignee])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchAssignableUsers(),
        fetchClients(),
        fetchServices()
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignableUsers = async () => {
    try {
      const response = await fetch(`${api.assignableUsers}?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setAssignableUsers(data)
      } else {
        console.error('Expected array but got:', data)
        setAssignableUsers([])
      }
    } catch (error) {
      console.error("Error fetching assignable users:", error)
      setAssignableUsers([]) // Set empty array on error
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch(`${api.clients}?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setClients(data)
        // For client role, automatically set the clientId to their own Client document ID
        if (user?.role === "client" && data.length > 0) {
          setTaskForm(prev => ({ ...prev, clientId: data[0].id || data[0]._id }))
        }
      } else {
        console.error('Expected array but got:', data)
        setClients([])
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      setClients([]) // Set empty array on error
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch(`${api.services}?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      // Determine assignee based on tab
      const assigneeId = activeTab === "self" ? user?.id : taskForm.assigneeId
      
      if (!assigneeId) {
        toast({
          title: "Error",
          description: "Please select an assignee"
        })
        return
      }

      // For client role, ensure clientId is set from their Client document
      let clientIdToUse = taskForm.clientId !== "none" ? taskForm.clientId : undefined
      if (user?.role === "client" && Array.isArray(clients) && clients.length > 0) {
        clientIdToUse = clients[0].id || clients[0]._id
      }

      const response = await fetch(api.tasks, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          assigneeId,
          createdBy: user?.id,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
          estimatedHours: taskForm.estimatedHours && taskForm.estimatedHours.trim() !== '' ? parseInt(taskForm.estimatedHours) : undefined,
          clientId: clientIdToUse,
          serviceId: taskForm.serviceId !== "none" ? taskForm.serviceId : undefined,
          tags: taskForm.tags && taskForm.tags.trim() !== '' ? taskForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : undefined,
          isRecurring: taskForm.isRecurring,
          recurrenceType: taskForm.recurrenceType !== "none" ? taskForm.recurrenceType : undefined,
          recurrenceInterval: taskForm.recurrenceInterval || 1,
          recurrenceEndDate: taskForm.recurrenceEndDate ? new Date(taskForm.recurrenceEndDate) : undefined,
          recurrenceCount: taskForm.recurrenceCount && taskForm.recurrenceCount.trim() !== '' ? parseInt(taskForm.recurrenceCount) : undefined
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Task created successfully"
        })
        resetForm()
        onSuccess()
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create task")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create task"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      estimatedHours: "",
      assigneeId: "",
      clientId: clientId || "none",
      serviceId: serviceId || "none",
      tags: ""
    })
    setActiveTab("self")
  }

  const handleClientChange = (selectedClientId: string) => {
    setTaskForm(prev => ({ 
      ...prev, 
      clientId: selectedClientId,
      serviceId: "none" // Reset service when client changes
    }))
  }

  const filteredServices = services.filter(service => 
    taskForm.clientId === "none" || service.clientId === taskForm.clientId
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a task for yourself or assign it to another team member
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="self" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>For Myself</span>
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Assign to Others</span>
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TabsContent value="self" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Self-Assigned Task</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                      placeholder="Enter task description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({...taskForm, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        value={taskForm.estimatedHours}
                        onChange={(e) => setTaskForm({...taskForm, estimatedHours: e.target.value})}
                        placeholder="e.g., 4"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={taskForm.tags}
                        onChange={(e) => setTaskForm({...taskForm, tags: e.target.value})}
                        placeholder="e.g., urgent, client-work"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="other" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Assign to Team Member</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="assignee">Assign To *</Label>
                    <Select value={taskForm.assigneeId} onValueChange={(value) => setTaskForm({...taskForm, assigneeId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(assignableUsers) ? assignableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        )) : []}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                      placeholder="Enter task description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({...taskForm, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        value={taskForm.estimatedHours}
                        onChange={(e) => setTaskForm({...taskForm, estimatedHours: e.target.value})}
                        placeholder="e.g., 4"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={taskForm.tags}
                        onChange={(e) => setTaskForm({...taskForm, tags: e.target.value})}
                        placeholder="e.g., urgent, client-work"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Common fields for both tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Additional Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client">Client (Optional)</Label>
                  <Select value={taskForm.clientId} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {Array.isArray(clients) ? clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      )) : []}
                    </SelectContent>
                  </Select>
                </div>
                
                {taskForm.clientId !== "none" && (
                  <div>
                    <Label htmlFor="service">Service (Optional)</Label>
                    <Select value={taskForm.serviceId} onValueChange={(value) => setTaskForm({...taskForm, serviceId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No service</SelectItem>
                        {filteredServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} ({service.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recurrence Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recurrence Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={taskForm.isRecurring}
                    onChange={(e) => setTaskForm({...taskForm, isRecurring: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isRecurring">Make this task recurring</Label>
                </div>

                {taskForm.isRecurring && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="recurrenceType">Recurrence Type</Label>
                      <Select value={taskForm.recurrenceType} onValueChange={(value) => setTaskForm({...taskForm, recurrenceType: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="recurrenceInterval">Every (interval)</Label>
                      <Input
                        id="recurrenceInterval"
                        type="number"
                        min="1"
                        value={taskForm.recurrenceInterval}
                        onChange={(e) => setTaskForm({...taskForm, recurrenceInterval: parseInt(e.target.value) || 1})}
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="recurrenceEndDate">End Date (optional)</Label>
                      <Input
                        id="recurrenceEndDate"
                        type="date"
                        value={taskForm.recurrenceEndDate}
                        onChange={(e) => setTaskForm({...taskForm, recurrenceEndDate: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="recurrenceCount">Max Occurrences (optional)</Label>
                      <Input
                        id="recurrenceCount"
                        type="number"
                        min="1"
                        value={taskForm.recurrenceCount}
                        onChange={(e) => setTaskForm({...taskForm, recurrenceCount: e.target.value})}
                        placeholder="e.g., 10"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
