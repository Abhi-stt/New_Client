"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CreateQueryDialog } from "@/components/dialogs/create-query-dialog"
import { QueryDetailsDialog } from "@/components/dialogs/query-details-dialog"
import { MessageSquare, Plus, Search, Filter, User, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function QueriesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedQuery, setSelectedQuery] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedPriority, setSelectedPriority] = useState("all")

  useEffect(() => {
    fetchQueries()
  }, [user])

  const fetchQueries = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/queries?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setQueries(data)
    } catch (error) {
      console.error("Error fetching queries:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredQueries = queries.filter((query: any) => {
    return (
      query.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === "all" || query.category === selectedCategory) &&
      (selectedStatus === "all" || query.status === selectedStatus) &&
      (selectedPriority === "all" || query.priority === selectedPriority)
    )
  })

  const updateQueryStatus = async (queryId: string, status: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/queries/${queryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Query status updated" })
        fetchQueries()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update query", variant: "destructive" })
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading queries...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Queries</h1>
            <p className="text-gray-600">Manage client queries and support tickets</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Query
          </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="tax">Tax Related</SelectItem>
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="general">General</SelectItem>
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
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

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

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("all")
                  setSelectedStatus("all")
                  setSelectedPriority("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Queries List */}
        <div className="grid gap-4">
          {filteredQueries.length > 0 ? (
            filteredQueries.map((query: any) => (
              <Card key={query.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <MessageSquare className="h-8 w-8 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">{query.title}</h3>
                          <Badge variant="outline">{query.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{query.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <User className="mr-1 h-3 w-3" />
                            {query.createdBy}
                          </span>
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {query.createdAt}
                          </span>
                          {query.assignedTo && <span>Assigned to: {query.assignedTo}</span>}
                          {query.responseCount > 0 && <span>{query.responseCount} responses</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Badge variant={getPriorityColor(query.priority)}>{query.priority}</Badge>
                      <Badge variant={getStatusColor(query.status)}>{query.status}</Badge>
                      {(user?.role === "admin" || user?.role === "manager" || user?.role === "team_member") && (
                        <Select value={query.status} onValueChange={(status) => updateQueryStatus(query.id, status)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setSelectedQuery(query)}>
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
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No queries found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== "all" || selectedStatus !== "all" || selectedPriority !== "all"
                    ? "No queries match your current filters."
                    : "No queries have been created yet."}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Query
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        <CreateQueryDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={fetchQueries} />

        {selectedQuery && (
          <QueryDetailsDialog
            query={selectedQuery}
            open={!!selectedQuery}
            onOpenChange={(open) => !open && setSelectedQuery(null)}
            onSuccess={fetchQueries}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
