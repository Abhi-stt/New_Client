"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DocumentRequestDialog } from "@/components/dialogs/document-request-dialog"
import { FileUploadDialog } from "@/components/dialogs/file-upload-dialog"
import { FileText, Upload, Download, Eye, Filter, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRef } from "react"

export default function DocumentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [documents, setDocuments] = useState([])
  const [clients, setClients] = useState([])
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState("all")
  const [selectedFirm, setSelectedFirm] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const backendBase = "http://localhost:5000"

  const [docxPreviewHtml, setDocxPreviewHtml] = useState<string | null>(null)
  const [showDocxModal, setShowDocxModal] = useState(false)

  useEffect(() => {
    fetchDocuments()
    fetchClients()
    if (user?.role === "client") {
      fetchFirms()
    }
  }, [user])

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/clients")
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchFirms = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/firms?clientId=${user?.id}`)
      const data = await response.json()
      setFirms(data)
    } catch (error) {
      console.error("Error fetching firms:", error)
    }
  }

  const filteredDocuments = documents.filter((doc: any) => {
    return (
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedClient === "all" || doc.clientId === selectedClient) &&
      (selectedFirm === "all" || doc.firmId === selectedFirm) &&
      (selectedType === "all" || doc.type === selectedType) &&
      (selectedStatus === "all" || doc.status === selectedStatus)
    )
  })

  const handleDownload = async (documentId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${documentId}/download`)
      if (response.ok) {
        const data = await response.json()
        if (data.downloadUrl) {
          const fileUrl = backendBase + data.downloadUrl
          const link = document.createElement('a')
          link.href = fileUrl
          link.download = ''
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          toast({ title: "Success", description: "Document downloaded successfully" })
        } else {
          toast({ title: "Error", description: "No download URL found", variant: "destructive" })
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" })
    }
  }

  const handleView = async (documentId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${documentId}/download`)
      if (response.ok) {
        const data = await response.json()
        if (data.downloadUrl) {
          const fileUrl = backendBase + data.downloadUrl
          const ext = fileUrl.split('.').pop()?.toLowerCase()
          if (ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') {
            window.open(fileUrl, '_blank')
          } else if (ext === 'docx') {
            // DOCX preview with mammoth
            const fileRes = await fetch(fileUrl)
            const blob = await fileRes.blob()
            const mammoth = await import('mammoth')
            const arrayBuffer = await blob.arrayBuffer()
            const result = await mammoth.convertToHtml({ arrayBuffer })
            setDocxPreviewHtml(result.value)
            setShowDocxModal(true)
          } else if (["doc", "xls", "xlsx", "ppt", "pptx"].includes(ext || '')) {
            window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`, '_blank')
          } else {
            // fallback: download
            const link = document.createElement('a')
            link.href = fileUrl
            link.download = ''
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        } else {
          toast({ title: "Error", description: "No viewable file found", variant: "destructive" })
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to view document", variant: "destructive" })
    }
  }

  const canRequestDocuments = user?.role === "admin" || user?.role === "manager"
  const canUploadDocuments = true // All roles can upload

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading documents...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600">Manage and track all documents</p>
          </div>
          <div className="flex space-x-2">
            {canUploadDocuments && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            )}
            {canRequestDocuments && (
              <Button variant="outline" onClick={() => setShowRequestDialog(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Request Document
              </Button>
            )}
          </div>
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
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {(user?.role === "admin" || user?.role === "manager") && (
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
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
              )}

              {user?.role === "client" && (
                <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Firm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Firms</SelectItem>
                    {firms.map((firm: any) => (
                      <SelectItem key={firm.id} value={firm.id}>
                        {firm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="GST Return">GST Return</SelectItem>
                  <SelectItem value="ITR">ITR</SelectItem>
                  <SelectItem value="Bank Statement">Bank Statement</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="TDS Certificate">TDS Certificate</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="synced">Synced</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedClient("all")
                  setSelectedFirm("all")
                  setSelectedType("all")
                  setSelectedStatus("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="grid gap-4">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((document: any) => (
              <Card key={document.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{document.name}</h3>
                        <p className="text-sm text-gray-600">{document.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Type: {document.type}</span>
                          <span>Client: {document.clientName}</span>
                          {document.firmName && <span>Firm: {document.firmName}</span>}
                          <span>Uploaded: {document.uploadedDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          document.status === "approved"
                            ? "default"
                            : document.status === "rejected"
                              ? "destructive"
                              : document.status === "synced"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {document.status}
                      </Badge>
                      {document.syncStatus && <Badge variant="outline">{document.syncStatus}</Badge>}
                      <Button size="sm" variant="outline" onClick={() => handleView(document.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(document.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ||
                  selectedClient !== "all" ||
                  selectedFirm !== "all" ||
                  selectedType !== "all" ||
                  selectedStatus !== "all"
                    ? "No documents match your current filters."
                    : "No documents have been uploaded yet."}
                </p>
                {canUploadDocuments && (
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload First Document
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        {canRequestDocuments && (
          <DocumentRequestDialog
            open={showRequestDialog}
            onOpenChange={setShowRequestDialog}
            onSuccess={fetchDocuments}
          />
        )}

        <FileUploadDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} onSuccess={fetchDocuments} />

        {/* DOCX Preview Modal */}
        <Dialog open={showDocxModal} onOpenChange={setShowDocxModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>DOCX Preview</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: docxPreviewHtml || '' }} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
