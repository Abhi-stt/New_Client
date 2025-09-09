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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { HOST_URL } from "@/lib/api"
import { useFormValidation, validationRules } from "@/hooks/useFormValidation"
import { ValidationError, ValidationHint } from "@/components/ui/validation-error"
import { Eye, EyeOff } from "lucide-react"

interface CreateManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateManagerDialog({ open, onOpenChange, onSuccess }: CreateManagerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  // Initialize form validation
  const {
    formState,
    errors,
    isValid,
    setFieldValue,
    setFieldTouched,
    validateForm,
    resetForm,
    getFieldProps
  } = useFormValidation(
    {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
    validationRules.user
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form before submission
    if (!validateForm()) {
      // Get the first error message to show specific guidance
      const firstError = Object.values(errors)[0]
      toast({
        title: "Please fix the form",
        description: firstError || "Please check all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Prepare manager data from form state
      const managerData = {
        name: formState.name.value,
        email: formState.email.value,
        phone: formState.phone.value,
        password: formState.password.value,
        role: "manager" // Always set role as manager for this dialog
      }

      const response = await fetch(`${HOST_URL}/api/users/create-manager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(managerData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Manager created successfully",
        })
        onSuccess()
        onOpenChange(false)
        resetForm()
      } else {
        const error = await response.json()
        // Show user-friendly error messages
        let errorMessage = "Failed to create manager"
        
        if (error.error && error.error.includes("email")) {
          errorMessage = "This email is already in use. Please use a different email address."
        } else if (error.details) {
          // Show the first validation error from server
          const firstError = Object.values(error.details)[0]
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
        } else if (error.message) {
          errorMessage = error.message
        }
        
        toast({
          title: "Cannot create manager",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Please check your internet connection and try again",
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
          <DialogTitle>Create New Manager</DialogTitle>
          <DialogDescription>
            Add a new manager to your organization. They will be able to manage team members and clients.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formState.name.value}
                onChange={(e) => setFieldValue('name', e.target.value)}
                onBlur={() => setFieldTouched('name', true)}
                className={errors.name ? 'border-red-500' : ''}
              />
              <ValidationError error={errors.name} />
              <ValidationHint hint="Enter the manager's full name (2-50 characters)" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formState.email.value}
                onChange={(e) => setFieldValue('email', e.target.value)}
                onBlur={() => setFieldTouched('email', true)}
                className={errors.email ? 'border-red-500' : ''}
              />
              <ValidationError error={errors.email} />
              <ValidationHint hint="Enter a valid email address" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={formState.phone.value}
                onChange={(e) => setFieldValue('phone', e.target.value)}
                onBlur={() => setFieldTouched('phone', true)}
                className={errors.phone ? 'border-red-500' : ''}
                placeholder="+91-9876543210"
              />
              <ValidationError error={errors.phone} />
              <ValidationHint hint="Enter a valid 10-digit Indian mobile number" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formState.password.value}
                  onChange={(e) => setFieldValue('password', e.target.value)}
                  onBlur={() => setFieldTouched('password', true)}
                  className={errors.password ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <ValidationError error={errors.password} />
              <ValidationHint hint="Password must be 8+ characters with uppercase, lowercase, number, and special character" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isValid}>
              {loading ? "Creating..." : !isValid ? "Please fill all required fields" : "Create Manager"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
