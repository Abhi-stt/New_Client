"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomCalendar } from "@/components/custom-calendar"
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog"
import { Plus, Filter } from "lucide-react"
import { HOST_URL } from "@/lib/api"

export default function CalendarPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState("all")
  const [selectedPriority, setSelectedPriority] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [view, setView] = useState("month")
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])

  useEffect(() => {
    fetchTasks()
    fetchClients()
  }, [user])

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/tasks?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setTasks(data)
        setFilteredTasks(data) // Initialize filtered tasks
      } else {
        console.error('Expected array but got:', data)
        setTasks([])
        setFilteredTasks([])
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([]) // Set empty array on error
      setFilteredTasks([])
    } finally {
      setLoading(false)
    }
  }

  // Generate recurring task instances
  const generateRecurringInstances = (task) => {
    if (!task.isRecurring || !task.recurrenceType || !task.dueDate) {
      return [task]
    }

    const instances = []
    const originalDate = new Date(task.dueDate)
    const currentDate = new Date()
    const endDate = new Date()
    endDate.setFullYear(currentDate.getFullYear() + 1) // Generate for next year

    let instanceDate = new Date(originalDate)
    let count = 0
    const maxInstances = task.recurrenceCount || 100

    while (instanceDate <= endDate && count < maxInstances) {
      if (instanceDate >= currentDate) {
        const instance = {
          ...task,
          id: `${task.id}_${instanceDate.toISOString().split('T')[0]}`,
          dueDate: instanceDate.toISOString(),
          isRecurringInstance: true,
          originalTaskId: task.id
        }
        instances.push(instance)
        count++
      }

      // Calculate next occurrence
      const nextDate = new Date(instanceDate)
      switch (task.recurrenceType) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + (task.recurrenceInterval || 1))
          break
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7 * (task.recurrenceInterval || 1))
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + (task.recurrenceInterval || 1))
          break
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + (task.recurrenceInterval || 1))
          break
        default:
          nextDate.setDate(nextDate.getDate() + 1)
      }
      instanceDate = nextDate
    }

    return instances
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

  // Live filtering effect
  useEffect(() => {
    // Ensure tasks is an array before filtering
    const tasksArray = Array.isArray(tasks) ? tasks : [];
    const filtered = tasksArray.filter((task: any) => {
      const clientMatch = selectedClient === "all" || task.clientId === selectedClient
      const priorityMatch = selectedPriority === "all" || task.priority === selectedPriority
      const statusMatch = selectedStatus === "all" || task.status === selectedStatus
      return clientMatch && priorityMatch && statusMatch
    })
    setFilteredTasks(filtered)
  }, [tasks, selectedClient, selectedPriority, selectedStatus])

  const canCreateEvents = user?.role === "admin" || user?.role === "manager" || user?.role === "client"

  // Generate calendar events from filtered tasks (including recurring instances)
  const generateCalendarEvents = () => {
    const events = []
    
    filteredTasks.forEach((task: any) => {
      if (task.isRecurring) {
        // Generate recurring instances
        const instances = generateRecurringInstances(task)
        instances.forEach(instance => {
          events.push({
            id: instance.id,
            title: instance.title,
            date: instance.dueDate,
            priority: instance.priority,
            clientName: instance.clientName,
            description: instance.description,
            status: instance.status,
            isRecurring: true,
            originalTaskId: instance.originalTaskId
          })
        })
      } else {
        // Single occurrence task
        events.push({
          id: task.id,
          title: task.title,
          date: task.dueDate,
          priority: task.priority,
          clientName: task.clientName,
          description: task.description,
          status: task.status,
          isRecurring: false
        })
      }
    })
    
    return events
  }

  const calendarTasks = generateCalendarEvents()

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading calendar...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">View tasks, deadlines, and compliance schedules</p>
          </div>
          <div className="flex space-x-2">
            {canCreateEvents && (
              <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            )}
          </div>
        </div>

        {/* Filters and View Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters & View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {Array.isArray(clients) ? clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={view} onValueChange={setView}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedClient("all")
                  setSelectedPriority("all")
                  setSelectedStatus("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Component */}
        <Card className="w-full">
          <CardContent className="p-0">
            <CustomCalendar events={calendarTasks} />
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">High Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Medium Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Low Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Compliance Deadline</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Task Dialog */}
        {canCreateEvents && (
          <CreateTaskDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSuccess={fetchTasks}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
