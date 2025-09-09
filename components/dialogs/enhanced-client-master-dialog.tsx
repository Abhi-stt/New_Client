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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileText, AlertTriangle, CheckCircle, Plus, Users, Clock, Target, Download } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

interface ClientMasterDialogProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Service {
  id: string
  name: string
  description: string
  category: string
  status: string
  dueDate: string
  assignedTo: any
  taskTemplates: any[]
  autoCreateTasks: boolean
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  assigneeId: any
  dueDate: string
  serviceId?: string
}

export function EnhancedClientMasterDialog({ client, open, onOpenChange, onSuccess }: ClientMasterDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [complianceData, setComplianceData] = useState({
    recurring: [],
    upcoming: [],
    overdue: [],
  })
  const [services, setServices] = useState<Service[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [generatingReport, setGeneratingReport] = useState(false)
  
  // Service creation form
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    category: "",
    dueDate: "",
    assignedTo: "",
    autoCreateTasks: true,
    taskTemplates: []
  })
  const [serviceTemplates, setServiceTemplates] = useState<any[]>([])
  const [assignableUsers, setAssignableUsers] = useState<any[]>([])

  useEffect(() => {
    if (open && client) {
      fetchAllData()
    }
  }, [open, client])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchComplianceData(),
        fetchServices(),
        fetchTasks(),
        fetchServiceTemplates(),
        fetchAssignableUsers()
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComplianceData = async () => {
    try {
      const response = await fetch(`${api.clientCompliance(client.id)}`)
      const data = await response.json()
      setComplianceData(data)
    } catch (error) {
      console.error("Error fetching compliance data:", error)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch(`${api.services}?clientId=${client.id}&role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${api.tasks}?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      // Ensure data is an array before filtering
      if (Array.isArray(data)) {
        // Filter tasks for this client
        const clientTasks = data.filter((task: Task) => task.clientId === client.id)
        setTasks(clientTasks)
      } else {
        console.error('Expected array but got:', data)
        setTasks([])
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([]) // Set empty array on error
    }
  }

  const fetchServiceTemplates = async () => {
    try {
      const response = await fetch(api.serviceTemplates)
      const data = await response.json()
      setServiceTemplates(data)
    } catch (error) {
      console.error("Error fetching service templates:", error)
    }
  }

  const fetchAssignableUsers = async () => {
    try {
      const response = await fetch(`${api.assignableUsers}?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setAssignableUsers(data)
    } catch (error) {
      console.error("Error fetching assignable users:", error)
    }
  }

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(api.services, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...serviceForm,
          clientId: client.id,
          createdBy: user?.id
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Service created successfully"
        })
        setShowServiceForm(false)
        setServiceForm({
          name: "",
          description: "",
          category: "",
          dueDate: "",
          assignedTo: "",
          autoCreateTasks: true,
          taskTemplates: []
        })
        fetchServices()
        onSuccess()
      } else {
        throw new Error("Failed to create service")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create service"
      })
    }
  }

  const handleCreateTasksFromService = async (serviceId: string) => {
    try {
      const response = await fetch(api.createTasksFromService(serviceId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createdBy: user?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: `Created ${data.tasks.length} tasks from service`
        })
        fetchTasks()
        fetchServices()
      } else {
        throw new Error("Failed to create tasks")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tasks from service"
      })
    }
  }

  const handleServiceTemplateSelect = (category: string, templateName: string) => {
    const categoryData = serviceTemplates.find(cat => cat.category === category)
    const template = categoryData?.templates.find((t: any) => t.name === templateName)
    
    if (template) {
      setServiceForm({
        ...serviceForm,
        name: template.name,
        description: template.description,
        category: category,
        taskTemplates: template.taskTemplates
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
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

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true)
      const response = await fetch(`${api.clients}/${client.id}/report`)
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.xlsx`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Client report generated and downloaded successfully"
      })
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setGeneratingReport(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2">Loading client data...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Master - {client.name}</DialogTitle>
          <DialogDescription>Comprehensive client management with services and tasks</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {client.type}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {client.email}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {client.phone}
                  </div>
                  <div>
                    <span className="font-medium">Address:</span> {client.address}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Active Services</p>
                      <p className="text-2xl font-bold">{services.filter(s => s.status === 'in_progress').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Pending Tasks</p>
                      <p className="text-2xl font-bold">{Array.isArray(tasks) ? tasks.filter(t => t.status === 'pending').length : 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Completed Tasks</p>
                      <p className="text-2xl font-bold">{Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Services</h3>
              <Button onClick={() => setShowServiceForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>

            {showServiceForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateService} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="serviceName">Service Name</Label>
                        <Input
                          id="serviceName"
                          value={serviceForm.name}
                          onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={(value) => handleServiceTemplateSelect(value, "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceTemplates.map((category) => (
                              <SelectItem key={category.category} value={category.category}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={serviceForm.dueDate}
                          onChange={(e) => setServiceForm({...serviceForm, dueDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="assignedTo">Assign To</Label>
                        <Select onValueChange={(value) => setServiceForm({...serviceForm, assignedTo: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button type="submit">Create Service</Button>
                      <Button type="button" variant="outline" onClick={() => setShowServiceForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{service.name}</h4>
                          <Badge className={getStatusColor(service.status)}>
                            {service.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Category: {service.category}</span>
                          {service.dueDate && <span>Due: {new Date(service.dueDate).toLocaleDateString()}</span>}
                          {service.assignedTo && <span>Assigned to: {service.assignedTo.name}</span>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {service.autoCreateTasks && service.taskTemplates.length > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleCreateTasksFromService(service.id)}
                          >
                            Create Tasks
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <h3 className="text-lg font-semibold">Tasks</h3>
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{task.title}</h4>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                          {task.assigneeId && <span>Assigned to: {task.assigneeId.name}</span>}
                          {task.serviceId && <span>Service: {task.serviceId.name}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            {/* Existing compliance content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compliance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Recurring:</span> {complianceData.recurring.length}
                  </div>
                  <div>
                    <span className="font-medium">Upcoming:</span> {complianceData.upcoming.length}
                  </div>
                  <div>
                    <span className="font-medium">Overdue:</span> {complianceData.overdue.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleGenerateReport} 
            disabled={generatingReport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {generatingReport ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
