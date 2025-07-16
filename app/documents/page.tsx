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
import { FileText, Upload, Download, Eye, Filter, Search, Lock, Unlock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useRef } from "react"
import { HOST_URL } from "@/lib/api"

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

  const backendBase = `${HOST_URL}`

  const [docxPreviewHtml, setDocxPreviewHtml] = useState<string | null>(null)
  const [showDocxModal, setShowDocxModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [pendingDocId, setPendingDocId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'download' | 'view' | null>(null)
  const [twoFACode, setTwoFACode] = useState("")
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [syncDoc, setSyncDoc] = useState<any>(null)
  const [syncFields, setSyncFields] = useState({
    syncWithGoogleSheets: false,
    googleSheetsUrl: "",
    syncWithSharePoint: false,
    sharePointUrl: ""
  })
  const [syncLoading, setSyncLoading] = useState(false)

  const openSyncDialog = (doc: any) => {
    setSyncDoc(doc)
    setSyncFields({
      syncWithGoogleSheets: doc.syncWithGoogleSheets || false,
      googleSheetsUrl: doc.googleSheetsUrl || "",
      syncWithSharePoint: doc.syncWithSharePoint || false,
      sharePointUrl: doc.sharePointUrl || ""
    })
    setShowSyncDialog(true)
  }

  const handleLinkSync = async () => {
    if (!syncDoc) return
    setSyncLoading(true)
    try {
      await fetch(`${HOST_URL}/api/documents/${syncDoc.id}/link-sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncFields)
      })
      setShowSyncDialog(false)
      fetchDocuments()
      toast({ title: "Sync settings updated" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to update sync settings", variant: "destructive" })
    } finally {
      setSyncLoading(false)
    }
  }

  const handleManualSync = async () => {
    if (!syncDoc) return
    setSyncLoading(true)
    try {
      await fetch(`${HOST_URL}/api/documents/${syncDoc.id}/sync`, { method: "POST" })
      fetchDocuments()
      toast({ title: "Manual sync triggered" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to sync document", variant: "destructive" })
    } finally {
      setSyncLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    fetchClients()
    if (user?.role === "client") {
      fetchFirms()
    }
  }, [user])

  const staticSampleDocuments = [
    {
      id: 'static-1',
      name: 'GST Return Q3 2024',
      description: 'Quarterly GST return for ABC Corporation',
      type: 'GST Return',
      clientName: 'ABC Corporation',
      firmName: 'ABC Corp Pvt Ltd',
      uploadedDate: '2024-01-10',
      status: 'approved',
    },
    {
      id: 'static-2',
      name: 'Bank Statement December 2024',
      description: 'Bank statement for reconciliation',
      type: 'Bank Statement',
      clientName: 'XYZ Industries',
      firmName: 'XYZ Industries Ltd',
      uploadedDate: '2024-01-12',
      status: 'pending',
    },
    {
      id: 'static-3',
      name: 'TDS Certificate Q3 2024',
      description: 'TDS certificate for professional services',
      type: 'TDS Certificate',
      clientName: 'DEF Solutions',
      firmName: 'ABC Corp Pvt Ltd',
      uploadedDate: '2024-01-15',
      status: 'synced',
    },
  ];

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/documents?role=${user?.role}&userId=${user?.id}`)
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
      const response = await fetch(`${HOST_URL}/api/clients`)
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchFirms = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/firms?clientId=${user?.id}`)
      const data = await response.json()
      setFirms(data)
    } catch (error) {
      console.error("Error fetching firms:", error)
    }
  }

  const filteredDocuments = (documents.length === 0 ? staticSampleDocuments : documents).filter((doc: any) => {
    return (
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedClient === "all" || doc.clientId === selectedClient) &&
      (selectedFirm === "all" || doc.firmId === selectedFirm) &&
      (selectedType === "all" || doc.type === selectedType) &&
      (selectedStatus === "all" || doc.status === selectedStatus)
    )
  })

  const handleDownload = async (documentId: string, code?: string) => {
    try {
      const headers: any = {
        'x-user-id': user?.id || '',
        'x-user-role': user?.role || '',
      }
      if (code) headers['x-2fa-code'] = code

      const response = await fetch(`${HOST_URL}/api/documents/${documentId}/download`, { headers })
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
      } else {
        const error = await response.json()
        if (
          (response.status === 401 || response.status === 403) &&
          error.error &&
          error.error.toLowerCase().includes("2fa")
        ) {
          setPendingDocId(documentId)
          setPendingAction('download')
          setShow2FAModal(true)
          toast({ title: "2FA Required", description: "Please enter your 2FA code to access this document." })
        } else {
          toast({ title: "Error", description: error.error || "Failed to download document", variant: "destructive" })
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" })
    }
  }

  const handleView = async (documentId: string, code?: string) => {
    try {
      const headers: any = {
        'x-user-id': user?.id || '',
        'x-user-role': user?.role || '',
      }
      if (code) headers['x-2fa-code'] = code

      const response = await fetch(`${HOST_URL}/api/documents/${documentId}/download`, { headers })
      if (response.ok) {
        const data = await response.json()
        if (data.downloadUrl) {
          const fileUrl = backendBase + data.downloadUrl
          const ext = fileUrl.split('.').pop()?.toLowerCase()
          if (['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
            window.open(fileUrl, '_blank')
          } else if (ext === 'docx') {
            setDocxPreviewHtml(null)
            setShowDocxModal(true)
            try {
              const fileRes = await fetch(fileUrl)
              const blob = await fileRes.blob()
              const mammoth = await import('mammoth')
              const arrayBuffer = await blob.arrayBuffer()
              const result = await mammoth.convertToHtml({ arrayBuffer })
              setDocxPreviewHtml(result.value)
            } catch (err) {
              setDocxPreviewHtml('<div style="color:red">Failed to preview DOCX file.</div>')
            }
          } else if (["doc", "xls", "xlsx", "ppt", "pptx"].includes(ext || '')) {
            window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`, '_blank')
          } else {
            toast({ title: "Preview not available", description: "This file type cannot be previewed. Downloading instead.", variant: "destructive" })
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
      } else {
        const error = await response.json()
        if (
          (response.status === 401 || response.status === 403) &&
          error.error &&
          error.error.toLowerCase().includes("2fa")
        ) {
          setPendingDocId(documentId)
          setPendingAction('view')
          setShow2FAModal(true)
          toast({ title: "2FA Required", description: "Please enter your 2FA code to access this document." })
        } else {
          toast({ title: "Error", description: error.error || "Failed to view document", variant: "destructive" })
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to view document", variant: "destructive" })
    }
  }

  const markConfidential = async (documentId: string, confidential: boolean) => {
    try {
      await fetch(`${HOST_URL}/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confidential }),
      })
      fetchDocuments()
      toast({ title: confidential ? "Marked as Confidential" : "Confidentiality Removed" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to update confidentiality", variant: "destructive" })
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
                      {document.syncStatus && (
                        <Badge variant={
                          document.syncStatus === "synced" ? "default" :
                          document.syncStatus === "pending" ? "secondary" :
                          document.syncStatus === "error" ? "destructive" : "outline"
                        }>
                          {document.syncStatus.charAt(0).toUpperCase() + document.syncStatus.slice(1)}
                        </Badge>
                      )}
                      {document.lastSyncedAt && (
                        <span className="text-xs text-gray-500 ml-2">Last sync: {new Date(document.lastSyncedAt).toLocaleString()}</span>
                      )}
                      {user?.role === "admin" && (
                        <Button
                          size="sm"
                          variant={document.confidential ? "destructive" : "outline"}
                          onClick={() => markConfidential(document.id, !document.confidential)}
                          title={document.confidential ? "Remove Confidentiality" : "Mark as Confidential"}
                        >
                          {document.confidential ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
                          {document.confidential ? "Confidential" : "Make Confidential"}
                        </Button>
                      )}
                      {document.confidential && (
                        <Badge variant="destructive"><Lock className="inline h-3 w-3 mr-1" /> Confidential</Badge>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleView(document.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(document.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      {(user?.role === "admin" || user?.role === "manager") && (
                        <Button size="sm" variant="outline" onClick={() => openSyncDialog(document)}>
                          Sync
                        </Button>
                      )}
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
            <div className="prose prose-sm max-w-none">
              {docxPreviewHtml === null ? (
                <div className="text-center text-gray-500">Loading preview...</div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: docxPreviewHtml || '' }} />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 2FA Modal */}
        {show2FAModal && (
          <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>2FA Verification</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Enter 2FA code"
                value={twoFACode}
                onChange={e => setTwoFACode(e.target.value)}
                maxLength={6}
              />
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (pendingDocId && pendingAction) {
                      if (pendingAction === 'download') {
                        await handleDownload(pendingDocId, twoFACode)
                      } else {
                        await handleView(pendingDocId, twoFACode)
                      }
                      setShow2FAModal(false)
                      setTwoFACode("")
                      setPendingDocId(null)
                      setPendingAction(null)
                    }
                  }}
                >
                  Verify & Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {showSyncDialog && syncDoc && (
          <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sync Settings for {syncDoc.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={syncFields.syncWithGoogleSheets} onChange={e => setSyncFields(f => ({ ...f, syncWithGoogleSheets: e.target.checked }))} />
                    <span>Sync with Google Sheets</span>
                  </label>
                  {syncFields.syncWithGoogleSheets && (
                    <Input
                      className="mt-2"
                      placeholder="Google Sheets URL"
                      value={syncFields.googleSheetsUrl}
                      onChange={e => setSyncFields(f => ({ ...f, googleSheetsUrl: e.target.value }))}
                    />
                  )}
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={syncFields.syncWithSharePoint} onChange={e => setSyncFields(f => ({ ...f, syncWithSharePoint: e.target.checked }))} />
                    <span>Sync with SharePoint</span>
                  </label>
                  {syncFields.syncWithSharePoint && (
                    <Input
                      className="mt-2"
                      placeholder="SharePoint Folder URL"
                      value={syncFields.sharePointUrl}
                      onChange={e => setSyncFields(f => ({ ...f, sharePointUrl: e.target.value }))}
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleLinkSync} disabled={syncLoading}>
                  {syncLoading ? "Saving..." : "Save Sync Settings"}
                </Button>
                <Button onClick={handleManualSync} variant="outline" disabled={syncLoading}>
                  {syncLoading ? "Syncing..." : "Sync Now"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}
