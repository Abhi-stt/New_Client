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
  const [view, setView] = useState("month")
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    fetchTasks()
    fetchClients()
  }, [user])

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

  const filteredEvents = events.filter((event: any) => {
    return (
      (selectedClient === "all" || event.clientId === selectedClient) &&
      (selectedPriority === "all" || event.priority === selectedPriority)
    )
  })

  const canCreateEvents = user?.role === "admin" || user?.role === "manager" || user?.role === "client"

  // Map tasks to calendar event format
  const calendarTasks = tasks.map((task: any) => ({
    id: task.id,
    title: task.title,
    date: task.dueDate,
    priority: task.priority,
    clientName: task.clientName,
    description: task.description,
  }))

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">View tasks, deadlines, and compliance schedules</p>
          </div>
          <div className="flex space-x-2">
            {canCreateEvents && (
              <Button onClick={() => setShowCreateDialog(true)}>
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
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
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
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Component */}
        <Card>
          <CardContent className="p-6">
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
