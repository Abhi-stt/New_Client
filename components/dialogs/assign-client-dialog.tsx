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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { HOST_URL } from "@/lib/api"

interface AssignClientDialogProps {
  member: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssignClientDialog({ member, open, onOpenChange, onSuccess }: AssignClientDialogProps) {
  const [clients, setClients] = useState([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchClients()
      setSelectedClients(member?.assignedClientIds || [])
    }
  }, [open, member])

  const fetchClients = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/clients`)
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const handleClientToggle = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId])
    } else {
      setSelectedClients(selectedClients.filter((id) => id !== clientId))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${HOST_URL}/api/users/${member.id}/assign-clients`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: selectedClients }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Client assignments updated successfully",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update assignments",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Clients</DialogTitle>
          <DialogDescription>Assign clients to {member?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Label>Select Clients:</Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {clients.map((client: any) => (
                <div key={client.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={client.id}
                    checked={selectedClients.includes(client.id)}
                    onCheckedChange={(checked) => handleClientToggle(client.id, checked as boolean)}
                  />
                  <Label htmlFor={client.id} className="text-sm font-normal">
                    {client.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Assignments"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
