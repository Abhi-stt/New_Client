"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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
import { File, X, Upload, Plus } from "lucide-react"
import { HOST_URL } from "@/lib/api"
import { CreateTeamMemberDialog } from "@/components/dialogs/create-team-member-dialog"
import { CreateClientDialog } from "@/components/dialogs/create-client-dialog"

interface Client {
  id: string;
  name: string;
  email: string;
  // Add other fields as needed
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role?: string;
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
    teamMemberId: "",
    firmId: "",
    syncWithGoogleSheets: false,
    syncWithSharePoint: false,
    googleSheetsUrl: "",
    sharePointUrl: "",
  })
  const [files, setFiles] = useState<File[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateTeamMember, setShowCreateTeamMember] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      if (user?.role === "client") {
        // Fetch the Client entity for this user
        fetchClientForUser()
      } else {
        fetchClients()
        fetchTeamMembers()
      }
      // Don't fetch firms initially - only when a client is selected
    }
  }, [open, user])

  // Fetch firms when client selection changes
  useEffect(() => {
    if (formData.clientId && formData.clientId !== "none") {
      fetchFirms(formData.clientId)
    } else {
      setFirms([]) // Clear firms when no client selected
      // Reset firm selection when client changes
      setFormData(prev => ({ ...prev, firmId: "" }))
    }
  }, [formData.clientId])

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

  const fetchFirms = async (clientId?: string) => {
    try {
      let url = `${HOST_URL}/api/firms?role=${user?.role}&userId=${user?.id}`
      if (clientId) {
        url += `&clientId=${clientId}`
      }
      
      const response = await fetch(url)
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

  const fetchClientForUser = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/clients?role=client&userId=${user?.id}`)
      const data = await response.json()
      
      if (Array.isArray(data) && data.length > 0) {
        setClients(data)
        setFormData((prev) => ({ ...prev, clientId: data[0].id }))
      } else {
        // Fallback: set clientId to user.id and empty clients array
        setClients([])
        setFormData((prev) => ({ ...prev, clientId: user?.id || "" }))
      }
    } catch (error) {
      console.error("Error fetching client for user:", error)
      setClients([])
      setFormData((prev) => ({ ...prev, clientId: user?.id || "" }))
    }
  }

  const fetchTeamMembers = async () => {
    try {
      let url = `${HOST_URL}/api/users/team-members?role=${user?.role}&userId=${user?.id}`
      if (user?.role === "admin") {
        url = `${HOST_URL}/api/users/all-team-members?role=${user?.role}&userId=${user?.id}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setTeamMembers(data.map((member: any) => ({
          id: member.id || member._id,
          name: member.name,
          email: member.email,
          role: member.role
        })))
      } else {
        console.error('Expected array but got:', data)
        setTeamMembers([])
      }
    } catch (error) {
      console.error("Error fetching team members:", error)
      setTeamMembers([])
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

      // Append form data - make clientId and teamMemberId optional
      Object.entries(formData).forEach(([key, value]) => {
        // Skip empty optional fields
        if ((key === 'firmId' || key === 'clientId' || key === 'teamMemberId') && (!value || value === 'none')) {
          return;
        }
        // Skip empty strings for optional fields
        if (value === '' && (key === 'description' || key === 'googleSheetsUrl' || key === 'sharePointUrl')) {
          uploadData.append(key, '');
        } else if (value !== '' && value !== 'none') {
          uploadData.append(key, value.toString());
        }
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
          teamMemberId: "",
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
              <div className="col-span-3 space-y-2">
                <Input 
                  id="files" 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  className="hidden" 
                  ref={fileInputRef}
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Files
                </Button>
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
                <div className="col-span-3 space-y-2">
                  <Select
                    value={formData.clientId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, clientId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Client</SelectItem>
                      {Array.isArray(clients) && clients.length > 0 ? (
                        clients.map((client: Client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.email})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No clients available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {user?.role === "admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateClient(true)}
                      className="w-full border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10 hover:border-[#4F46E5]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Client
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Team Member Selection */}
            {user?.role !== "client" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="teamMember" className="text-right">
                  Team Member
                </Label>
                <div className="col-span-3 space-y-2">
                  <Select
                    value={formData.teamMemberId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, teamMemberId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Team Member</SelectItem>
                      {Array.isArray(teamMembers) && teamMembers.length > 0 ? (
                        teamMembers.map((member: TeamMember) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.email}) {member.role && `- ${member.role}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No team members available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {user?.role === "admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateTeamMember(true)}
                      className="w-full border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10 hover:border-[#4F46E5]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team Member
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Only show firms dropdown when a client is selected */}
            {formData.clientId && formData.clientId !== "none" && (
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
                    {Array.isArray(firms) ? firms.map((firm: any) => (
                      <SelectItem key={firm.id} value={firm.id}>
                        {firm.name}
                      </SelectItem>
                    )) : []}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || files.length === 0}
              className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
            >
              {loading ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Create Team Member Dialog */}
      <CreateTeamMemberDialog
        open={showCreateTeamMember}
        onOpenChange={setShowCreateTeamMember}
        onSuccess={() => {
          fetchTeamMembers()
          setShowCreateTeamMember(false)
        }}
      />
      
      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onSuccess={() => {
          fetchClients()
          setShowCreateClient(false)
        }}
      />
    </Dialog>
  )
}
