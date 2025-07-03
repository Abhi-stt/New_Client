"use client"

import type React from "react"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { HOST_URL } from "@/lib/api"

interface TwoFactorDialogProps {
  member: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TwoFactorDialog({ member, open, onOpenChange, onSuccess }: TwoFactorDialogProps) {
  const [action, setAction] = useState<"enable" | "disable" | "reset">("enable")
  const [newCode, setNewCode] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${HOST_URL}/api/users/${member.id}/2fa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code: newCode,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message,
        })
        onSuccess()
        onOpenChange(false)
        setNewCode("")
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update 2FA",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update 2FA",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setNewCode(code)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage 2FA for {member?.name}</DialogTitle>
          <DialogDescription>Enable, disable, or reset two-factor authentication</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Current Status:</Label>
              <p className="text-sm text-gray-600">
                2FA is currently {member?.twoFactorEnabled ? "enabled" : "disabled"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Action:</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="enable"
                    name="action"
                    value="enable"
                    checked={action === "enable"}
                    onChange={(e) => setAction(e.target.value as "enable")}
                    disabled={member?.twoFactorEnabled}
                  />
                  <Label htmlFor="enable">Enable 2FA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="disable"
                    name="action"
                    value="disable"
                    checked={action === "disable"}
                    onChange={(e) => setAction(e.target.value as "disable")}
                    disabled={!member?.twoFactorEnabled}
                  />
                  <Label htmlFor="disable">Disable 2FA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="reset"
                    name="action"
                    value="reset"
                    checked={action === "reset"}
                    onChange={(e) => setAction(e.target.value as "reset")}
                    disabled={!member?.twoFactorEnabled}
                  />
                  <Label htmlFor="reset">Reset 2FA Code</Label>
                </div>
              </div>
            </div>

            {(action === "enable" || action === "reset") && (
              <div className="space-y-2">
                <Label htmlFor="code">2FA Code:</Label>
                <div className="flex space-x-2">
                  <Input
                    id="code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {action === "enable"
                    ? "Generate a new 2FA code for the user"
                    : "Generate a new code to replace the existing one"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || ((action === "enable" || action === "reset") && !newCode)}>
              {loading ? "Updating..." : "Update 2FA"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
