"use client"

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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, Users, FileText, Calendar } from "lucide-react"
import { HOST_URL } from "@/lib/api"

interface FirmDetailsDialogProps {
  firm: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function FirmDetailsDialog({ firm, open, onOpenChange, onSuccess }: FirmDetailsDialogProps) {
  const [firmData, setFirmData] = useState({
    details: null,
    team: [],
    documents: [],
    compliance: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && firm) {
      fetchFirmDetails()
    }
  }, [open, firm])

  const fetchFirmDetails = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/firms/${firm.id}/details`)
      const data = await response.json()
      setFirmData(data)
    } catch (error) {
      console.error("Error fetching firm details:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!firm) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5" />
            {firm.name}
          </DialogTitle>
          <DialogDescription>Firm details and management</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Firm Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Firm Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {firm.type}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <Badge variant={firm.status === "active" ? "default" : "secondary"}>{firm.status}</Badge>
                </div>
                <div>
                  <span className="font-medium">Registration No:</span> {firm.registrationNumber}
                </div>
                <div>
                  <span className="font-medium">PAN:</span> {firm.panNumber || "N/A"}
                </div>
                <div>
                  <span className="font-medium">GST:</span> {firm.gstNumber || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Compliance Rate:</span>{" "}
                  <Badge variant={firm.complianceRate >= 90 ? "default" : "destructive"}>{firm.complianceRate}%</Badge>
                </div>
              </div>
              <div className="mt-4">
                <span className="font-medium">Address:</span>
                <p className="text-sm text-gray-600 mt-1">{firm.address}</p>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading firm details...</p>
            </div>
          ) : (
            <>
              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Team Members ({firmData.team.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {firmData.team.length > 0 ? (
                      firmData.team.map((member: any, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{member.name}</span>
                            <p className="text-sm text-gray-600">{member.role}</p>
                          </div>
                          <Badge variant="outline">{member.status}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No team members assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Recent Documents ({firmData.documents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {firmData.documents.length > 0 ? (
                      firmData.documents.slice(0, 5).map((doc: any, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{doc.name}</span>
                            <p className="text-sm text-gray-600">{doc.type}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{doc.status}</Badge>
                            <p className="text-xs text-gray-500">{doc.uploadedDate}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No documents uploaded</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {firmData.compliance.length > 0 ? (
                      firmData.compliance.map((item: any, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                item.status === "compliant"
                                  ? "default"
                                  : item.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {item.status}
                            </Badge>
                            <p className="text-xs text-gray-500">{item.dueDate}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No compliance items</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => console.log("Manage Firm")}>Manage Firm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
