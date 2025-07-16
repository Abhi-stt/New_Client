"use client"

import type React from "react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { File, X } from "lucide-react"
import { HOST_URL } from "@/lib/api"

interface Client {
  id: string;
  name: string;
  email: string;
  // Add other fields as needed
}

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function FileUploadDialog({ open, onOpenChange, onSuccess }: FileUploadDialogProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    clientId: "",
    firmId: "",
    syncWithGoogleSheets: false,
    syncWithSharePoint: false,
    googleSheetsUrl: "",
    sharePointUrl: "",
  })
  const [files, setFiles] = useState<File[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      if (user?.role === "client") {
        // Fetch the Client entity for this user
        fetchClientForUser()
      } else {
        fetchClients()
      }
      fetchFirms()
    }
  }, [open, user])

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
      const response = await fetch(`${HOST_URL}/api/firms?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setFirms(data)
    } catch (error) {
      console.error("Error fetching firms:", error)
    }
  }

  const fetchClientForUser = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/clients?role=client&userId=${user?.id}`)
      const data = await response.json()
      if (data.length > 0) {
        setClients(data)
        setFormData((prev) => ({ ...prev, clientId: data[0].id }))
      } else {
        // Fallback: set clientId to user.id
        setFormData((prev) => ({ ...prev, clientId: user?.id || "" }))
      }
    } catch (error) {
      setFormData((prev) => ({ ...prev, clientId: user?.id || "" }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const uploadData = new FormData()

      // Append form data
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'firmId' && !value) return; // Skip empty firmId
        uploadData.append(key, value.toString())
      })

      // Add userId for role-based filtering
      uploadData.append("userId", user?.id || "")

      // Append files
      files.forEach((file) => {
        uploadData.append("files", file)
      })

      const response = await fetch(`${HOST_URL}/api/documents/upload`, {
        method: "POST",
        body: uploadData,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document uploaded successfully",
        })
        onSuccess()
        onOpenChange(false)
        setFormData({
          name: "",
          description: "",
          type: "",
          clientId: "",
          firmId: "",
          syncWithGoogleSheets: false,
          syncWithSharePoint: false,
          googleSheetsUrl: "",
          sharePointUrl: "",
        })
        setFiles([])
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to upload document",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Upload documents and configure synchronization with external platforms</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* File Upload */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="files" className="text-right">
                Files
              </Label>
              <div className="col-span-3">
                <Input id="files" type="file" multiple onChange={handleFileChange} className="mb-2" />
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <File className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="Document name"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST Return">GST Return</SelectItem>
                  <SelectItem value="ITR">ITR</SelectItem>
                  <SelectItem value="Bank Statement">Bank Statement</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="TDS Certificate">TDS Certificate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Document description"
              />
            </div>

            {/* Client Selection */}
            {user?.role !== "client" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client" className="text-right">
                  Client
                </Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: Client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* If client, show their name as read-only */}
            {user?.role === "client" && clients.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Client</Label>
                <div className="col-span-3">
                  <Input value={clients[0].name} readOnly className="bg-gray-100" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firm" className="text-right">
                Firm
              </Label>
              <Select
                value={formData.firmId || "none"}
                onValueChange={(value) => setFormData({ ...formData, firmId: value === "none" ? "" : value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select firm (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Firm</SelectItem>
                  {firms.map((firm: any) => (
                    <SelectItem key={firm.id} value={firm.id}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Synchronization Options */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Sync Options</Label>
              <div className="col-span-3 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncGoogleSheets"
                    checked={formData.syncWithGoogleSheets}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, syncWithGoogleSheets: checked as boolean })
                    }
                  />
                  <Label htmlFor="syncGoogleSheets">Sync with Google Sheets</Label>
                </div>

                {formData.syncWithGoogleSheets && (
                  <Input
                    placeholder="Google Sheets URL"
                    value={formData.googleSheetsUrl}
                    onChange={(e) => setFormData({ ...formData, googleSheetsUrl: e.target.value })}
                  />
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncSharePoint"
                    checked={formData.syncWithSharePoint}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncWithSharePoint: checked as boolean })}
                  />
                  <Label htmlFor="syncSharePoint">Sync with SharePoint</Label>
                </div>

                {formData.syncWithSharePoint && (
                  <Input
                    placeholder="SharePoint URL"
                    value={formData.sharePointUrl}
                    onChange={(e) => setFormData({ ...formData, sharePointUrl: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || files.length === 0}>
              {loading ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
