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
import { Calendar, FileText, AlertTriangle, CheckCircle } from "lucide-react"

interface ClientMasterDialogProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ClientMasterDialog({ client, open, onOpenChange, onSuccess }: ClientMasterDialogProps) {
  const [complianceData, setComplianceData] = useState({
    recurring: [],
    upcoming: [],
    overdue: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && client) {
      fetchComplianceData()
    }
  }, [open, client])

  const fetchComplianceData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/clients/${client.id}/compliance`)
      const data = await response.json()
      setComplianceData(data)
    } catch (error) {
      console.error("Error fetching compliance data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Master - {client.name}</DialogTitle>
          <DialogDescription>Compliance tracking and recurring requirements</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                  <span className="font-medium">Status:</span>{" "}
                  <Badge variant={client.status === "active" ? "default" : "secondary"}>{client.status}</Badge>
                </div>
                <div>
                  <span className="font-medium">Email:</span> {client.email}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {client.phone}
                </div>
                <div>
                  <span className="font-medium">Compliance Rate:</span>{" "}
                  <Badge variant={client.complianceRate >= 90 ? "default" : "destructive"}>
                    {client.complianceRate}%
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Firms:</span> {client.firmsCount || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading compliance data...</p>
            </div>
          ) : (
            <>
              {/* Recurring Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Recurring Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceData.recurring.length > 0 ? (
                      complianceData.recurring.map((item: any, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{item.frequency}</Badge>
                            <p className="text-xs text-gray-500 mt-1">Next: {item.nextDue}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No recurring compliance items</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceData.upcoming.length > 0 ? (
                      complianceData.upcoming.map((item: any, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="default">{item.dueDate}</Badge>
                            <p className="text-xs text-gray-500 mt-1">{item.daysLeft} days left</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No upcoming deadlines</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Overdue Items */}
              {complianceData.overdue.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center text-red-600">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Overdue Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {complianceData.overdue.map((item: any, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                        >
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <div>
                              <h4 className="font-medium text-red-900">{item.name}</h4>
                              <p className="text-sm text-red-700">{item.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">{item.dueDate}</Badge>
                            <p className="text-xs text-red-600 mt-1">{item.daysOverdue} days overdue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => console.log("Generate Report")}>Generate Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
