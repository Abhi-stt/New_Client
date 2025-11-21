"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  Target,
  FileText,
  TrendingUp,
  Trash2
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { TaskCreationDialog } from "@/components/dialogs/task-creation-dialog"
import { TaskReassignmentDialog } from "@/components/dialogs/task-reassignment-dialog"
import { ProgressUpdateDialog } from "@/components/dialogs/progress-update-dialog"

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
  completionNotes?: string
  reviewNotes?: string
  completedAt?: string
  reviewedAt?: string
  originalTaskId?: string
  reviewTaskId?: string
  estimatedHours?: number
  actualHours?: number
  tags?: string[]
  currentProgress?: number
  lastProgressUpdate?: string
  progressHistory?: any[]
}

export function TaskManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [showProgressUpdate, setShowProgressUpdate] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: "",
    completionNotes: "",
    reviewNotes: ""
  })

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${api.tasks}?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setTasks(data)
      } else {
        console.error('Expected array but got:', data)
        setTasks([])
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([]) // Set empty array on error
      toast({
        title: "Error",
        description: "Failed to fetch tasks"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return

    try {
      const response = await fetch(api.taskStatus(selectedTask.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...statusUpdateForm,
          userId: user?.id
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Task status updated successfully"
        })
        setShowStatusUpdate(false)
        setSelectedTask(null)
        setStatusUpdateForm({ status: "", completionNotes: "", reviewNotes: "" })
        fetchTasks()
      } else {
        throw new Error("Failed to update task status")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status"
      })
    }
  }

  const openStatusUpdate = (task: Task) => {
    setSelectedTask(task)
    setStatusUpdateForm({
      status: task.status,
      completionNotes: task.completionNotes || "",
      reviewNotes: task.reviewNotes || ""
    })
    setShowStatusUpdate(true)
  }

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
  }

  const openReassignDialog = (task: Task) => {
    setSelectedTask(task)
    setShowReassignDialog(true)
  }

  const openProgressUpdate = (task: Task) => {
    setSelectedTask(task)
    setShowProgressUpdate(true)
  }

  const openDeleteDialog = (task: Task) => {
    setTaskToDelete(task)
    setShowDeleteDialog(true)
  }

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      const response = await fetch(`${api.tasks}/${taskToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Task deleted successfully"
        })
        setShowDeleteDialog(false)
        setTaskToDelete(null)
        fetchTasks() // Refresh the tasks list
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete task",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'review': return 'bg-purple-100 text-purple-800'
      case 'approved': return 'bg-emerald-100 text-emerald-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'pending': return <AlertTriangle className="h-4 w-4" />
      case 'review': return <Eye className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredTasks = (Array.isArray(tasks) ? tasks : []).filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const taskStats = {
    total: Array.isArray(tasks) ? tasks.length : 0,
    pending: Array.isArray(tasks) ? tasks.filter(t => t.status === 'pending').length : 0,
    inProgress: Array.isArray(tasks) ? tasks.filter(t => t.status === 'in_progress').length : 0,
    completed: Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0,
    review: Array.isArray(tasks) ? tasks.filter(t => t.status === 'review').length : 0,
    approved: Array.isArray(tasks) ? tasks.filter(t => t.status === 'approved').length : 0
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Task Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your tasks and track progress</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Create Task</span>
          <span className="sm:hidden">New Task</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{taskStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{taskStats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{taskStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Review</p>
                <p className="text-2xl font-bold">{taskStats.review}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold">{taskStats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-base sm:text-lg">{task.title}</h3>
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1">{task.status}</span>
                    </Badge>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    {task.originalTaskId && (
                      <Badge variant="outline" className="text-purple-600">
                        Review Task
                      </Badge>
                    )}
                    {task.reassignedAt && (
                      <Badge variant="outline" className="text-blue-600">
                        Reassigned
                      </Badge>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Assigned to: {task.assigneeId?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Created by: {task.createdBy?.name || 'Unknown'}</span>
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {task.clientId && (
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4" />
                        <span>Client: {task.clientId.name}</span>
                      </div>
                    )}
                    {task.serviceId && (
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>Service: {task.serviceId.name}</span>
                      </div>
                    )}
                  </div>
                  
                  {task.completionNotes && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                      <strong>Completion Notes:</strong> {task.completionNotes}
                    </div>
                  )}
                  
                  {task.reviewNotes && (
                    <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
                      <strong>Review Notes:</strong> {task.reviewNotes}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Task Details Button - For all users */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openTaskDetails(task)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Manager-specific actions */}
                  {user?.role === 'manager' ? (
                    <>
                      {/* Assign to Team Button - Always visible for managers */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReassignDialog(task)}
                        className="bg-blue-50 border-blue-200 hover:bg-blue-100"
                      >
                        <User className="h-4 w-4 text-blue-600" />
                        Assign to Team
                      </Button>
                      
                      {/* Edit Button - Always visible for managers */}
                      <Button
                        size="sm"
                        onClick={() => openStatusUpdate(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Non-manager actions */}
                      {/* Progress Update Button - Only for assignees */}
                      {(task.assigneeId?.id === user?.id || 
                        task.assigneeId?._id === user?.id || 
                        task.assigneeId === user?.id) && 
                        task.status !== 'completed' && task.status !== 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openProgressUpdate(task)}
                        >
                          <TrendingUp className="h-4 w-4" />
                          Progress
                        </Button>
                      )}
                      
                      {/* Edit Button - For non-managers */}
                      <Button
                        size="sm"
                        onClick={() => openStatusUpdate(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* Delete Button - Only for admin users */}
                      {user?.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(task)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredTasks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Create your first task to get started"}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Creation Dialog */}
      <TaskCreationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchTasks}
      />

      {/* Task Reassignment Dialog */}
      <TaskReassignmentDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        task={selectedTask}
        onSuccess={fetchTasks}
      />

      {/* Progress Update Dialog */}
      <ProgressUpdateDialog
        open={showProgressUpdate}
        onOpenChange={setShowProgressUpdate}
        task={selectedTask}
        onSuccess={fetchTasks}
      />

      {/* Task Details Dialog */}
      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              View detailed information about this task
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getStatusColor(selectedTask.status)}>
                    {getStatusIcon(selectedTask.status)}
                    <span className="ml-1">{selectedTask.status}</span>
                  </Badge>
                  <Badge className={getPriorityColor(selectedTask.priority)}>
                    {selectedTask.priority}
                  </Badge>
                </div>
              </div>
              
              {selectedTask.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-600">{selectedTask.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Assigned to:</span> {selectedTask.assigneeId?.name}
                </div>
                <div>
                  <span className="font-medium">Created by:</span> {selectedTask.createdBy?.name}
                </div>
                {selectedTask.dueDate && (
                  <div>
                    <span className="font-medium">Due date:</span> {new Date(selectedTask.dueDate).toLocaleDateString()}
                  </div>
                )}
                {selectedTask.estimatedHours && (
                  <div>
                    <span className="font-medium">Estimated hours:</span> {selectedTask.estimatedHours}
                  </div>
                )}
              </div>
              
                              {selectedTask.reassignedAt && (
                  <div>
                    <span className="font-medium">Reassigned:</span> {new Date(selectedTask.reassignedAt).toLocaleDateString()}
                  </div>
                )}
                {selectedTask.reassignedBy && (
                  <div>
                    <span className="font-medium">Reassigned by:</span> {selectedTask.reassignedBy?.name}
                  </div>
                )}
                {selectedTask.completionNotes && (
                  <div>
                    <h4 className="font-medium mb-2">Completion Notes</h4>
                    <p className="text-gray-600 bg-green-50 p-3 rounded">{selectedTask.completionNotes}</p>
                  </div>
                )}
              
              {selectedTask.reviewNotes && (
                <div>
                  <h4 className="font-medium mb-2">Review Notes</h4>
                  <p className="text-gray-600 bg-purple-50 p-3 rounded">{selectedTask.reviewNotes}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                                 {/* Debug info */}
                 <div className="text-xs text-gray-500 mb-2 w-full">
                   Debug: User role: {user?.role}, User ID: {user?.id}, 
                   Task assignee: {typeof selectedTask.assigneeId === 'object' ? selectedTask.assigneeId?.id || selectedTask.assigneeId?._id : selectedTask.assigneeId}, 
                   Task status: {selectedTask.status}
                 </div>
                
                                 {/* Reassign Button - Only for managers */}
                 {user?.role === 'manager' && 
                  (selectedTask.assigneeId?.id === user?.id || 
                   selectedTask.assigneeId?._id === user?.id || 
                   selectedTask.assigneeId === user?.id) && 
                  selectedTask.status !== 'completed' && selectedTask.status !== 'approved' ? (
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       setShowTaskDetails(false)
                       openReassignDialog(selectedTask)
                     }}
                   >
                     <User className="h-4 w-4 mr-2" />
                     Reassign Task
                   </Button>
                 ) : null}
                
                {/* Update Status Button - For all users */}
                <Button
                  size="sm"
                  onClick={() => openStatusUpdate(selectedTask)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Task Status</DialogTitle>
            <DialogDescription>
              Update the status and add notes for this task
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusUpdateForm.status} onValueChange={(value) => setStatusUpdateForm({...statusUpdateForm, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {statusUpdateForm.status === 'completed' && (
              <div>
                <Label htmlFor="completionNotes">Completion Notes</Label>
                <Textarea
                  id="completionNotes"
                  value={statusUpdateForm.completionNotes}
                  onChange={(e) => setStatusUpdateForm({...statusUpdateForm, completionNotes: e.target.value})}
                  placeholder="Add notes about task completion..."
                />
              </div>
            )}
            
            {statusUpdateForm.status === 'approved' && (
              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  value={statusUpdateForm.reviewNotes}
                  onChange={(e) => setStatusUpdateForm({...statusUpdateForm, reviewNotes: e.target.value})}
                  placeholder="Add review notes..."
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowStatusUpdate(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Status
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {taskToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800">{taskToDelete.title}</h4>
                <p className="text-sm text-red-600 mt-1">
                  Status: {taskToDelete.status} | Priority: {taskToDelete.priority}
                </p>
                {taskToDelete.description && (
                  <p className="text-sm text-red-600 mt-2">{taskToDelete.description}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={handleDeleteTask}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
