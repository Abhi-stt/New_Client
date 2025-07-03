"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog"
import { TaskDetailsDialog } from "@/components/dialogs/task-details-dialog"
import { CheckSquare, Plus, Calendar, User, Building, Filter, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { HOST_URL } from "@/lib/api"

export default function TasksPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState("all")
  const [selectedAssignee, setSelectedAssignee] = useState("all")
  const [selectedPriority, setSelectedPriority] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  useEffect(() => {
    fetchTasks()
    fetchClients()
    if (user?.role === "admin" || user?.role === "manager") {
      fetchTeamMembers()
    }
  }, [user])

  const staticSampleTasks = [
    {
      id: 'static-1',
      title: 'GST Return Filing - Q4 2024',
      description: 'File quarterly GST return for ABC Corporation',
      dueDate: '2024-01-25',
      clientName: 'ABC Corporation',
      assigneeName: 'Team Member',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'static-2',
      title: 'Bank Reconciliation - December 2024',
      description: 'Reconcile bank statements for XYZ Industries',
      dueDate: '2024-01-30',
      clientName: 'XYZ Industries',
      assigneeName: 'Team Member',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      id: 'static-3',
      title: 'TDS Payment - Q3 2024',
      description: 'Process TDS payment for DEF Solutions',
      dueDate: '2024-01-15',
      clientName: 'DEF Solutions',
      assigneeName: 'Team Member',
      priority: 'high',
      status: 'completed',
    },
  ];

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/tasks?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

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

  const filteredTasks = (tasks.length === 0 ? staticSampleTasks : tasks).filter((task: any) => {
    return (
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedClient === "all" || task.clientId === selectedClient) &&
      (selectedAssignee === "all" || task.assigneeId === selectedAssignee) &&
      (selectedPriority === "all" || task.priority === selectedPriority) &&
      (selectedStatus === "all" || task.status === selectedStatus)
    )
  })

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch(`${HOST_URL}/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Task status updated" })
        fetchTasks()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" })
    }
  }

  const canCreateTasks = user?.role === "admin" || user?.role === "manager" || user?.role === "client"

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600">Manage and track all tasks</p>
          </div>
          {canCreateTasks && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(user?.role === "admin" || user?.role === "manager") && (
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {teamMembers.map((member: any) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedClient("all")
                  setSelectedAssignee("all")
                  setSelectedPriority("all")
                  setSelectedStatus("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="grid gap-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task: any) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <CheckSquare className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="text-sm text-gray-600">{task.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            Due: {task.dueDate}
                          </span>
                          <span className="flex items-center">
                            <Building className="mr-1 h-3 w-3" />
                            {task.clientName}
                          </span>
                          {task.assigneeName && (
                            <span className="flex items-center">
                              <User className="mr-1 h-3 w-3" />
                              {task.assigneeName}
                            </span>
                          )}
                          {task.recurrence && (
                            <Badge variant="outline" className="text-xs">
                              Recurring: {task.recurrence}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      <Badge variant={getStatusColor(task.status)}>{task.status}</Badge>
                      <Select value={task.status} onValueChange={(status) => updateTaskStatus(task.id, status)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setSelectedTask(task)}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ||
                  selectedClient !== "all" ||
                  selectedAssignee !== "all" ||
                  selectedPriority !== "all" ||
                  selectedStatus !== "all"
                    ? "No tasks match your current filters."
                    : "No tasks have been created yet."}
                </p>
                {canCreateTasks && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Task
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        {canCreateTasks && (
          <CreateTaskDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={fetchTasks} />
        )}

        {selectedTask && (
          <TaskDetailsDialog
            task={selectedTask}
            open={!!selectedTask}
            onOpenChange={(open) => !open && setSelectedTask(null)}
            onSuccess={fetchTasks}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
