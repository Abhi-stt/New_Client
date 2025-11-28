"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomCalendar } from "@/components/custom-calendar"
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog"
import { Plus, Filter } from "lucide-react"
import { api, HOST_URL } from "@/lib/api"

const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "All", color: "bg-slate-200 text-slate-700", activeColor: "bg-slate-700 text-white" },
  { value: "tasks", label: "Task", color: "bg-cyan-100 text-cyan-700", activeColor: "bg-cyan-500 text-white" },
  { value: "case", label: "Case", color: "bg-amber-100 text-amber-700", activeColor: "bg-amber-500 text-white" },
  { value: "hearing", label: "Hearing", color: "bg-rose-100 text-rose-700", activeColor: "bg-rose-500 text-white" },
  { value: "appointment", label: "Appointment / Meeting", color: "bg-emerald-100 text-emerald-700", activeColor: "bg-emerald-500 text-white" },
]

export default function CalendarPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState("all")
  const [selectedPriority, setSelectedPriority] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [calendarView, setCalendarView] = useState("month")
  const [eventFilter, setEventFilter] = useState("all")
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [casesData, setCasesData] = useState<any[]>([])
  const [hearingsData, setHearingsData] = useState<any[]>([])

  useEffect(() => {
    fetchTasks()
    fetchClients()
    fetchCasesData()
    fetchHearingsData()
  }, [user])

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/tasks?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      let parsedTasks: any[] = []
      if (Array.isArray(data)) {
        parsedTasks = data
      } else if (Array.isArray(data?.tasks)) {
        parsedTasks = data.tasks
      }
      setTasks(parsedTasks)
      setFilteredTasks(parsedTasks)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([]) // Set empty array on error
      setFilteredTasks([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCasesData = async () => {
    if (!user?.id) return
    try {
      const response = await fetch(`${api.cases}?role=${encodeURIComponent(user.role)}&userId=${user.id}`)
      const data = await response.json()
      setCasesData(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching cases:", error)
      setCasesData([])
    }
  }

  const fetchHearingsData = async () => {
    if (!user?.id) return
    try {
      const response = await fetch(
        `${api.hearings}?role=${encodeURIComponent(user.role)}&userId=${user.id}&range=all`,
      )
      const data = await response.json()
      setHearingsData(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching hearings:", error)
      setHearingsData([])
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

  const taskEvents = useMemo(() => {
    const events = []
    filteredTasks.forEach((task: any) => {
      if (!task.dueDate) {
        return
      }
      if (task.isRecurring) {
        const instances = generateRecurringInstances(task)
        instances.forEach((instance) => {
          events.push({
            id: instance.id,
            title: instance.title,
            date: instance.dueDate,
            priority: instance.priority,
            clientName: instance.clientName,
            description: instance.description,
            category: "tasks",
          })
        })
      } else {
        events.push({
          id: task.id,
          title: task.title,
          date: task.dueDate,
          priority: task.priority,
          clientName: task.clientName,
          description: task.description,
          category: "tasks",
        })
      }
    })
    return events
  }, [filteredTasks])

  const caseEvents = useMemo(() => {
    if (!Array.isArray(casesData)) return []
    const now = new Date()
    return casesData.flatMap((caseItem: any) => {
      const entries: any[] = []
      const caseId = caseItem.id || caseItem._id
      if (caseItem?.dueDate) {
        const dueDate = new Date(caseItem.dueDate)
        if (!Number.isNaN(dueDate.getTime())) {
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          entries.push({
            id: `case-due-${caseId}`,
            title: `Case Due: ${caseItem.caseTitle}`,
            date: caseItem.dueDate,
            priority: diffDays <= 3 ? "high" : "medium",
            clientName: caseItem.clientSnapshot?.name,
            description: `Authority: ${caseItem.authorityName || "—"}`,
            category: "case",
            badge: "Case Due",
            meta: {
              caseId,
              status: caseItem.status,
              dueDate: caseItem.dueDate,
            },
          })
        }
      }
      if (caseItem?.nextHearingDate) {
        entries.push({
          id: `case-next-hearing-${caseId}`,
          title: `Next Hearing: ${caseItem.caseTitle}`,
          date: caseItem.nextHearingDate,
          priority: "medium",
          clientName: caseItem.clientSnapshot?.name,
          description: caseItem.officerName
            ? `Officer: ${caseItem.officerName}`
            : caseItem.authorityName
              ? `Authority: ${caseItem.authorityName}`
              : undefined,
          category: "case",
          badge: "Next Hearing",
          meta: {
            caseId,
            officer: caseItem.officerName,
          },
        })
      }
      return entries
    })
  }, [casesData])

  const hearingEvents = useMemo(() => {
    if (!Array.isArray(hearingsData)) return []
    return hearingsData.map((hearing: any) => ({
      id: `hearing-${hearing.id || hearing._id}`,
      title: `Hearing: ${hearing.caseTitle}`,
      date: hearing.hearingDate,
      priority: "low",
      clientName: hearing.clientSnapshot?.name,
      description: hearing.purpose || (hearing.outcome ? `Outcome: ${hearing.outcome.replace(/_/g, " ")}` : undefined),
      category: "hearing",
      badge: hearing.outcome ? hearing.outcome.replace(/_/g, " ") : "Hearing",
      meta: {
        hearingId: hearing.id || hearing._id,
        officer: hearing.officerName || hearing.benchName,
        nextHearingDate: hearing.nextHearingDate,
        caseId: hearing.caseId,
      },
    }))
  }, [hearingsData])

  const normalizedFilter = eventFilter === "appointment" ? "tasks" : eventFilter

  const calendarEvents = useMemo(() => {
    const combined = []
    if (normalizedFilter === "all" || normalizedFilter === "tasks") {
      combined.push(...taskEvents)
    }
    if (normalizedFilter === "all" || normalizedFilter === "case") {
      combined.push(...caseEvents)
    }
    if (normalizedFilter === "all" || normalizedFilter === "hearing") {
      combined.push(...hearingEvents)
    }
    return combined
  }, [normalizedFilter, taskEvents, caseEvents, hearingEvents])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1] mx-auto"></div>
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

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedClient("all")
                  setSelectedPriority("all")
                  setSelectedStatus("all")
                  setEventFilter("all")
                  setCalendarView("month")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Component */}
        <Card className="w-full">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const isActive = eventFilter === option.value
                  const baseClass = isActive ? option.activeColor : option.color
                  const stateClass = isActive ? "shadow" : "opacity-80 hover:opacity-100"
                  return (
                    <button
                      key={option.value}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${baseClass} ${stateClass}`}
                      onClick={() => setEventFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-2 py-1">
                {["month", "week", "day"].map((mode) => {
                  const isActive = calendarView === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => setCalendarView(mode)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        isActive
                          ? "bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white shadow"
                          : "text-slate-600"
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <CustomCalendar events={calendarEvents} view={calendarView} />
            </div>
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
                <div className="w-4 h-4 bg-gradient-to-r from-[#6366F1] to-[#A855F7] rounded"></div>
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
