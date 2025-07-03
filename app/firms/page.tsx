"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CreateFirmDialog } from "@/components/dialogs/create-firm-dialog"
import { FirmDetailsDialog } from "@/components/dialogs/firm-details-dialog"
import { Building, Plus, Search, Filter, Users, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { HOST_URL } from "@/lib/api"

export default function FirmsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedFirm, setSelectedFirm] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedType, setSelectedType] = useState("all")

  useEffect(() => {
    fetchFirms()
  }, [user])

  const fetchFirms = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/firms?clientId=${user?.id}`)
      const data = await response.json()
      setFirms(data)
    } catch (error) {
      console.error("Error fetching firms:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFirms = firms.filter((firm: any) => {
    return (
      firm.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedStatus === "all" || firm.status === selectedStatus) &&
      (selectedType === "all" || firm.type === selectedType)
    )
  })

  const handleFirmDetails = (firm: any) => {
    setSelectedFirm(firm)
    setShowDetailsDialog(true)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading firms...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">My Firms</h1>
            <p className="text-gray-600">Manage your business entities and compliance</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Firm
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search firms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Business Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                  <SelectItem value="public_ltd">Public Limited</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="llp">LLP</SelectItem>
                  <SelectItem value="proprietorship">Proprietorship</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedStatus("all")
                  setSelectedType("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Firms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFirms.length > 0 ? (
            filteredFirms.map((firm: any) => (
              <Card key={firm.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{firm.name}</h3>
                      <p className="text-sm text-gray-600">{firm.registrationNumber}</p>
                      <p className="text-xs text-gray-500">{firm.address}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <Badge variant="outline">{firm.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={firm.status === "active" ? "default" : "secondary"}>{firm.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Team Members:</span>
                      <span className="text-sm font-medium">{firm.teamCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Compliance:</span>
                      <Badge variant={firm.complianceRate >= 90 ? "default" : "destructive"}>
                        {firm.complianceRate}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleFirmDetails(firm)}>
                      <Building className="mr-2 h-4 w-4" />
                      Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <Users className="mr-2 h-4 w-4" />
                      Team
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      Docs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No firms found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || selectedStatus !== "all" || selectedType !== "all"
                      ? "No firms match your current filters."
                      : "No firms have been added yet."}
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Firm
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Dialogs */}
        <CreateFirmDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={fetchFirms} />

        {selectedFirm && (
          <FirmDetailsDialog
            firm={selectedFirm}
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            onSuccess={fetchFirms}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
