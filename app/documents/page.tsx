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
import { FileText, Upload, Download, Eye, Filter, Search, Lock, Unlock, ExternalLink } from "lucide-react"
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
  const [connectionStatus, setConnectionStatus] = useState({
    google: { connected: false, email: null as string | null },
    microsoft: { connected: false, email: null as string | null }
  })
  const [showSheetViewer, setShowSheetViewer] = useState(false)
  const [sheetViewerUrl, setSheetViewerUrl] = useState<string | null>(null)
  const [sheetViewerType, setSheetViewerType] = useState<'google' | 'sharepoint' | null>(null)
  const [sheetViewerTitle, setSheetViewerTitle] = useState<string>("")
  const [iframeLoading, setIframeLoading] = useState(true)

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/documents/sync-status?userId=${user?.id}`)
      if (response.ok) {
        const status = await response.json()
        setConnectionStatus(status)
      }
    } catch (error) {
      console.error("Error fetching connection status:", error)
    }
  }

  const openSyncDialog = async (doc: any) => {
    setSyncDoc(doc)
    setSyncFields({
      syncWithGoogleSheets: doc.syncWithGoogleSheets || false,
      googleSheetsUrl: doc.googleSheetsUrl || "",
      syncWithSharePoint: doc.syncWithSharePoint || false,
      sharePointUrl: doc.sharePointUrl || ""
    })
    setShowSyncDialog(true)
    // Fetch connection status after a brief delay to ensure state is set
    setTimeout(() => {
      if (doc && user?.id) {
        fetchConnectionStatus()
      }
    }, 100)
  }

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/auth/google?userId=${user?.id}`)
      const data = await response.json()
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700')
        // Poll for connection status after a delay
        setTimeout(() => fetchConnectionStatus(), 3000)
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to connect Google account", variant: "destructive" })
    }
  }

  const handleConnectSharePoint = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/auth/sharepoint?userId=${user?.id}`)
      const data = await response.json()
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700')
        // Poll for connection status after a delay
        setTimeout(() => fetchConnectionStatus(), 3000)
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to connect Microsoft account", variant: "destructive" })
    }
  }

  const handleDisconnectGoogle = async () => {
    try {
      await fetch(`${HOST_URL}/api/documents/disconnect-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id })
      })
      fetchConnectionStatus()
      toast({ title: "Google account disconnected" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to disconnect Google account", variant: "destructive" })
    }
  }

  const handleDisconnectSharePoint = async () => {
    try {
      await fetch(`${HOST_URL}/api/documents/disconnect-sharepoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id })
      })
      fetchConnectionStatus()
      toast({ title: "Microsoft account disconnected" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to disconnect Microsoft account", variant: "destructive" })
    }
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
      const response = await fetch(`${HOST_URL}/api/documents/${syncDoc.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id })
      })
      
      const result = await response.json()
      
      if (response.ok || response.status === 207) {
        fetchDocuments()
        if (result.errors && result.errors.length > 0) {
          toast({ 
            title: "Sync completed with errors", 
            description: result.errors.map((e: any) => `${e.service}: ${e.error}`).join(', '),
            variant: "destructive" 
          })
        } else {
          toast({ title: "Sync completed successfully" })
        }
      } else {
        throw new Error(result.error || "Sync failed")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to sync document", variant: "destructive" })
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
    
    // Handle URL parameters for client filtering
    const urlParams = new URLSearchParams(window.location.search)
    const clientId = urlParams.get('clientId')
    if (clientId) {
      setSelectedClient(clientId)
      // Set page title to indicate client-specific view
      document.title = `Documents - Client View`
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
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setDocuments(data)
      } else {
        console.error('Expected array but got:', data)
        setDocuments([])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      setDocuments([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/clients?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setClients(data)
      } else {
        console.error('Expected array but got:', data)
        setClients([])
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      setClients([]) // Set empty array on error
    }
  }

  const fetchFirms = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/firms?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        setFirms(data)
      } else {
        console.error('Expected array but got:', data)
        setFirms([])
      }
    } catch (error) {
      console.error("Error fetching firms:", error)
      setFirms([]) // Set empty array on error
    }
  }

  const filteredDocuments = (() => {
    // Ensure we have an array to work with
    const documentsArray = Array.isArray(documents) ? documents : [];
    const dataToFilter = documentsArray.length === 0 ? staticSampleDocuments : documentsArray;
    
    return dataToFilter.filter((doc: any) => {
      return (
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedClient === "all" || doc.clientId === selectedClient) &&
        (selectedFirm === "all" || doc.firmId === selectedFirm) &&
        (selectedType === "all" || doc.type === selectedType) &&
        (selectedStatus === "all" || doc.status === selectedStatus)
      )
    })
  })()

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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage and track all documents</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {canUploadDocuments && (
              <Button onClick={() => setShowUploadDialog(true)} className="w-full sm:w-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25">
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Upload Document</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            )}
            {canRequestDocuments && (
              <Button variant="outline" onClick={() => setShowRequestDialog(true)} className="w-full sm:w-auto border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10 hover:border-[#4F46E5]">
                <FileText className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Request Document</span>
                <span className="sm:hidden">Request</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    {Array.isArray(clients) ? clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    )) : []}
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-start space-x-4">
                      <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base">{document.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{document.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-2 text-xs text-gray-500">
                          <span>Type: {document.type}</span>
                          <span>Client: {document.clientName}</span>
                          {document.firmName && <span>Firm: {document.firmName}</span>}
                          <span>Uploaded: {document.uploadedDate}</span>
                        </div>
                        {/* Sync URLs - Always visible if synced */}
                        {(document.syncWithGoogleSheets || document.syncWithSharePoint) && (
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                            {document.syncWithGoogleSheets && document.googleSheetsUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Convert to embeddable URL
                                  const sheetIdMatch = document.googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
                                  if (sheetIdMatch) {
                                    const sheetId = sheetIdMatch[1]
                                    // Extract gid if present for specific sheet tab
                                    const gidMatch = document.googleSheetsUrl.match(/[#&]gid=(\d+)/)
                                    const gid = gidMatch ? `&gid=${gidMatch[1]}` : ''
                                    // Use /edit for full editing capabilities, looks exactly like Google Sheets
                                    const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit${gid ? `?${gid.replace('&', '')}` : ''}`
                                    setSheetViewerUrl(embedUrl)
                                    setSheetViewerType('google')
                                    setSheetViewerTitle(`${document.name} - Google Sheet`)
                                    setIframeLoading(true)
                                    setShowSheetViewer(true)
                                  } else {
                                    // Fallback to original URL if can't parse
                                    setSheetViewerUrl(document.googleSheetsUrl)
                                    setSheetViewerType('google')
                                    setSheetViewerTitle(`${document.name} - Google Sheet`)
                                    setIframeLoading(true)
                                    setShowSheetViewer(true)
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Google Sheet
                              </button>
                            )}
                            {document.syncWithSharePoint && document.sharePointUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // For SharePoint, try to embed or open in viewer
                                  // SharePoint URLs can be complex, so we'll use Office Online viewer
                                  let embedUrl = document.sharePointUrl
                                  // If it's a file URL, convert to Office Online viewer
                                  if (embedUrl.includes('/Shared%20Documents/') || embedUrl.includes('/Shared Documents/')) {
                                    // Keep original URL for iframe embedding
                                    embedUrl = document.sharePointUrl
                                  }
                                  setSheetViewerUrl(embedUrl)
                                  setSheetViewerType('sharepoint')
                                  setSheetViewerTitle(`${document.name} - SharePoint`)
                                  setIframeLoading(true)
                                  setShowSheetViewer(true)
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View SharePoint
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                        <span className="text-xs text-gray-500">Last sync: {new Date(document.lastSyncedAt).toLocaleString()}</span>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Sync Settings for {syncDoc.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Show current sync status if document is already synced */}
                {(syncDoc.syncWithGoogleSheets || syncDoc.syncWithSharePoint) && (
                  <div className="bg-blue-50 p-3 rounded-md space-y-2">
                    <p className="text-sm font-medium text-blue-900">Current Sync Configuration:</p>
                    {syncDoc.syncWithGoogleSheets && syncDoc.googleSheetsUrl && (
                      <div className="text-xs text-blue-800">
                        <span className="font-medium">Google Sheets:</span>{' '}
                        <button
                          onClick={() => {
                            const sheetIdMatch = syncDoc.googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
                            if (sheetIdMatch) {
                              const sheetId = sheetIdMatch[1]
                              // Extract gid if present for specific sheet tab
                              const gidMatch = syncDoc.googleSheetsUrl.match(/[#&]gid=(\d+)/)
                              const gid = gidMatch ? `&gid=${gidMatch[1]}` : ''
                              // Use /edit for full editing capabilities, looks exactly like Google Sheets
                              const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit${gid ? `?${gid.replace('&', '')}` : ''}`
                              setSheetViewerUrl(embedUrl)
                              setSheetViewerType('google')
                              setSheetViewerTitle(`${syncDoc.name} - Google Sheet`)
                              setIframeLoading(true)
                              setShowSheetViewer(true)
                            }
                          }}
                          className="underline hover:text-blue-900 cursor-pointer"
                        >
                          {syncDoc.googleSheetsUrl.length > 50 ? syncDoc.googleSheetsUrl.substring(0, 50) + '...' : syncDoc.googleSheetsUrl}
                        </button>
                      </div>
                    )}
                    {syncDoc.syncWithSharePoint && syncDoc.sharePointUrl && (
                      <div className="text-xs text-blue-800">
                        <span className="font-medium">SharePoint:</span>{' '}
                        <button
                          onClick={() => {
                            setSheetViewerUrl(syncDoc.sharePointUrl)
                            setSheetViewerType('sharepoint')
                            setSheetViewerTitle(`${syncDoc.name} - SharePoint`)
                            setIframeLoading(true)
                            setShowSheetViewer(true)
                          }}
                          className="underline hover:text-blue-900 cursor-pointer"
                        >
                          {syncDoc.sharePointUrl.length > 50 ? syncDoc.sharePointUrl.substring(0, 50) + '...' : syncDoc.sharePointUrl}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Google Sheets Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="syncGoogleSheets"
                        checked={syncFields.syncWithGoogleSheets} 
                        onChange={e => setSyncFields(f => ({ ...f, syncWithGoogleSheets: e.target.checked }))} 
                      />
                      <label htmlFor="syncGoogleSheets" className="font-medium">Sync with Google Sheets</label>
                    </div>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="ml-6 text-sm">
                    {connectionStatus.google.connected ? (
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">
                          ✓ Connected: {connectionStatus.google.email}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handleDisconnectGoogle}
                          className="text-xs h-7"
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleConnectGoogle}
                        className="text-xs"
                      >
                        Connect Google Account
                      </Button>
                    )}
                  </div>

                  {syncFields.syncWithGoogleSheets && (
                    <>
                      <Input
                        className="ml-6"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={syncFields.googleSheetsUrl}
                        onChange={e => setSyncFields(f => ({ ...f, googleSheetsUrl: e.target.value }))}
                      />
                      {!connectionStatus.google.connected && (
                        <p className="ml-6 text-xs text-red-600">
                          Please connect your Google account first
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* SharePoint Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="syncSharePoint"
                        checked={syncFields.syncWithSharePoint} 
                        onChange={e => setSyncFields(f => ({ ...f, syncWithSharePoint: e.target.checked }))} 
                      />
                      <label htmlFor="syncSharePoint" className="font-medium">Sync with SharePoint</label>
                    </div>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="ml-6 text-sm">
                    {connectionStatus.microsoft.connected ? (
                      <div className="flex items-center justify-between">
                        <span className="text-green-600">
                          ✓ Connected: {connectionStatus.microsoft.email}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handleDisconnectSharePoint}
                          className="text-xs h-7"
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleConnectSharePoint}
                        className="text-xs"
                      >
                        Connect Microsoft Account
                      </Button>
                    )}
                  </div>

                  {syncFields.syncWithSharePoint && (
                    <>
                      <Input
                        className="ml-6"
                        placeholder="https://yourcompany.sharepoint.com/sites/..."
                        value={syncFields.sharePointUrl}
                        onChange={e => setSyncFields(f => ({ ...f, sharePointUrl: e.target.value }))}
                      />
                      {!connectionStatus.microsoft.connected && (
                        <p className="ml-6 text-xs text-red-600">
                          Please connect your Microsoft account first
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button onClick={handleLinkSync} disabled={syncLoading} className="w-full sm:w-auto">
                  {syncLoading ? "Saving..." : "Save Sync Settings"}
                </Button>
                <Button 
                  onClick={handleManualSync} 
                  variant="outline" 
                  disabled={syncLoading || (!connectionStatus.google.connected && !connectionStatus.microsoft.connected)}
                  className="w-full sm:w-auto"
                >
                  {syncLoading ? "Syncing..." : "Sync Now"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Embedded Sheet/SharePoint Viewer */}
        {showSheetViewer && sheetViewerUrl && (
          <Dialog open={showSheetViewer} onOpenChange={setShowSheetViewer}>
            <DialogContent 
              className="max-w-[98vw] max-h-[95vh] w-full h-full p-0 gap-0 overflow-hidden [&>button]:hidden"
              style={{ 
                transform: 'translate(-50%, -50%)',
                left: '50%',
                top: '50%',
                borderRadius: '0.5rem',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header with gradient background */}
              <DialogHeader className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      {sheetViewerType === 'google' ? (
                        <FileText className="h-5 w-5 text-white" />
                      ) : (
                        <FileText className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <DialogTitle className="text-white text-lg font-semibold m-0">
                      {sheetViewerTitle}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowSheetViewer(false)
                        setIframeLoading(true)
                      }}
                      className="text-white hover:bg-white/10"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              {/* Content area with iframe */}
              <div className="relative w-full flex-1 bg-gray-100" style={{ height: 'calc(95vh - 80px)', minHeight: '600px' }}>
                {/* Loading overlay */}
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600 font-medium">Loading {sheetViewerType === 'google' ? 'Google Sheet' : 'SharePoint'}...</p>
                    </div>
                  </div>
                )}
                
                {/* Iframe container - Full Google Sheets interface */}
                <div className="w-full h-full bg-white rounded-b-lg overflow-hidden shadow-inner">
                  {sheetViewerType === 'google' ? (
                    <iframe
                      src={sheetViewerUrl}
                      className="w-full h-full border-0"
                      title="Google Sheet Editor"
                      allow="clipboard-read; clipboard-write; fullscreen"
                      allowFullScreen
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation"
                      onLoad={() => setIframeLoading(false)}
                      style={{ 
                        display: iframeLoading ? 'none' : 'block',
                        minHeight: '600px',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  ) : (
                    <iframe
                      src={sheetViewerUrl}
                      className="w-full h-full border-0"
                      title="SharePoint Viewer"
                      allow="clipboard-read; clipboard-write; fullscreen"
                      allowFullScreen
                      onLoad={() => setIframeLoading(false)}
                      style={{ 
                        display: iframeLoading ? 'none' : 'block',
                        minHeight: '600px',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}
