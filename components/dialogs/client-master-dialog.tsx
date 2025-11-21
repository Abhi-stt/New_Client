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
import { Calendar, FileText, AlertTriangle, CheckCircle, Download } from "lucide-react"
import { HOST_URL } from "@/lib/api"
import * as XLSX from 'xlsx'
import { useToast } from "@/hooks/use-toast"

interface ClientMasterDialogProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ClientMasterDialog({ client, open, onOpenChange, onSuccess }: ClientMasterDialogProps) {
  const { toast } = useToast()
  const [complianceData, setComplianceData] = useState({
    recurring: [],
    upcoming: [],
    overdue: [],
  })
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    if (open && client) {
      fetchComplianceData()
    }
  }, [open, client])

  const fetchComplianceData = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/clients/${client.id}/compliance`)
      const data = await response.json()
      setComplianceData(data)
    } catch (error) {
      console.error("Error fetching compliance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true)
      const response = await fetch(`${HOST_URL}/api/clients/${client.id}/report`)
      
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1] mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading compliance data...</p>
            </div>
          ) : (
            <>
              {/* Compliance Summary */}
              {complianceData.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compliance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gradient-to-br from-[#6366F1]/10 to-[#A855F7]/10 rounded-lg">
                        <div className="text-2xl font-bold bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">{complianceData.summary.total}</div>
                        <div className="text-sm text-gray-600">Total Items</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{complianceData.summary.completed}</div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{complianceData.summary.upcoming}</div>
                        <div className="text-sm text-gray-600">Upcoming</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{complianceData.summary.overdue}</div>
                        <div className="text-sm text-gray-600">Overdue</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Recurring Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Recurring Compliance ({complianceData.recurring?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceData.recurring && complianceData.recurring.length > 0 ? (
                      complianceData.recurring.map((item: any, index) => (
                        <div key={item.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}>
                                {item.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Category: {item.category}</span>
                              {item.regulatoryBody && <span>Body: {item.regulatoryBody}</span>}
                              {item.formNumber && <span>Form: {item.formNumber}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{item.frequency}</Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              Next: {item.nextDue ? new Date(item.nextDue).toLocaleDateString() : 'N/A'}
                            </p>
                            {item.assignedTo && (
                              <p className="text-xs text-gray-500 mt-1">Assigned: {item.assignedTo}</p>
                            )}
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
                    Upcoming Deadlines ({complianceData.upcoming?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceData.upcoming && complianceData.upcoming.length > 0 ? (
                      complianceData.upcoming.map((item: any, index) => (
                        <div key={item.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 flex-1">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium">{item.name}</h4>
                                <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}>
                                  {item.priority}
                                </Badge>
                                {item.type && (
                                  <Badge variant="outline">{item.type}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Category: {item.category}</span>
                                {item.assignedTo && <span>Assigned: {item.assignedTo}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="default">
                              {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.daysUntilDue > 0 ? `${item.daysUntilDue} days left` : 'Due today'}
                            </p>
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
              {complianceData.overdue && complianceData.overdue.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center text-red-600">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Overdue Items ({complianceData.overdue.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {complianceData.overdue.map((item: any, index) => (
                        <div
                          key={item.id || index}
                          className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-red-900">{item.name}</h4>
                                <Badge variant="destructive">{item.priority}</Badge>
                                {item.type && (
                                  <Badge variant="outline">{item.type}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-red-700 mb-1">{item.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-red-600">
                                <span>Category: {item.category}</span>
                                {item.assignedTo && <span>Assigned: {item.assignedTo}</span>}
                                {item.penaltyAmount > 0 && <span>Penalty: ₹{item.penaltyAmount}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">
                              {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                            </Badge>
                            <p className="text-xs text-red-600 mt-1">
                              {item.daysOverdue} days overdue
                            </p>
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
          <Button 
            onClick={handleGenerateReport} 
            disabled={generatingReport}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
          >
            <Download className="h-4 w-4" />
            {generatingReport ? "Generating..." : "Generate Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
