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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { HOST_URL } from "@/lib/api"
import { useFormValidation, validationRules } from "@/hooks/useFormValidation"
import { ValidationError, ValidationHint } from "@/components/ui/validation-error"
import { Eye, EyeOff } from "lucide-react"

interface CreateTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateTeamMemberDialog({ open, onOpenChange, onSuccess }: CreateTeamMemberDialogProps) {
  const { user } = useAuth()
  const [managers, setManagers] = useState([])
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
      role: "team_member",
      status: "active",
      managerId: "",
    },
    {
      ...validationRules.user,
      managerId: { 
        required: false, // Make optional since managers might not be available in new admin domains
        custom: (value) => {
          // Manager doesn't need to select manager
          if (user?.role === "manager") return { isValid: true };
          
          // If admin is creating team_member role and there are managers available, require selection
          if (user?.role === "admin" && formState.role.value === "team_member") {
            if (Array.isArray(managers) && managers.length > 0 && !value) {
              return { isValid: false, error: 'Please select a manager from the available options' };
            }
          }
          
          return { isValid: true };
        }
      }
    }
  )

  useEffect(() => {
    if (open && user?.role === "admin") {
      fetchManagers()
    }
  }, [open, user])

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/users/managers?role=${user?.role}&userId=${user?.id}`)
      const data = await response.json()
      setManagers(data)
    } catch (error) {
      console.error("Error fetching managers:", error)
    }
  }

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
      // Prepare team member data from form state
      const payload: any = {
        name: formState.name.value.trim(),
        email: formState.email.value.trim(),
        password: formState.password.value,
        role: formState.role.value,
        status: "active",
      }
      
      // Only include phone if it has a value
      if (formState.phone.value && formState.phone.value.trim() !== '') {
        payload.phone = formState.phone.value.trim()
      }
      
      // Handle managerId - set it if manager role, or if admin selected a manager
      if (user?.role === "manager") {
        payload.managerId = user.id
      } else if (formState.managerId.value && formState.managerId.value.trim() !== '' && formState.managerId.value !== 'none') {
        payload.managerId = formState.managerId.value
      }

      console.log('Creating team member with payload:', payload)
      
      const response = await fetch(`${HOST_URL}/api/users?role=${user?.role}&userId=${user?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      console.log('Response status:', response.status)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team member created successfully",
        })
        onSuccess()
        onOpenChange(false)
        resetForm()
      } else {
        const error = await response.json()
        console.error('Team member creation error:', error)
        
        // Show user-friendly error messages
        let errorMessage = "Failed to create team member"
        
        if (error.error && error.error.includes("email")) {
          errorMessage = "This email is already in use. Please use a different email address."
        } else if (error.error && error.error.includes("manager")) {
          errorMessage = "Please select a manager for this team member."
        } else if (error.details) {
          // Show the first validation error from server
          const firstErrorKey = Object.keys(error.details)[0]
          const firstErrorValue = error.details[firstErrorKey]
          errorMessage = `${firstErrorKey}: ${Array.isArray(firstErrorValue) ? firstErrorValue[0] : firstErrorValue}`
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error
        } else if (error.message) {
          errorMessage = error.message
        }
        
        toast({
          title: "Cannot create team member",
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-900">Add Team Member</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Add a new team member to your organization. Fill in all the required information below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 py-6">
            <div className="space-y-6 max-w-none">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="border-l-4 border-[#6366F1] pl-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  <p className="text-sm text-gray-600">Basic details about the team member</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formState.name.value}
                      onChange={(e) => setFieldValue('name', e.target.value)}
                      onBlur={() => setFieldTouched('name', true)}
                      className={`h-11 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter full name"
                    />
                    <ValidationError error={errors.name} />
                    <ValidationHint hint="Enter the team member's full name (2-50 characters)" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={formState.phone.value}
                      onChange={(e) => setFieldValue('phone', e.target.value)}
                      onBlur={() => setFieldTouched('phone', true)}
                      className={`h-11 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="+91-9876543210"
                    />
                    <ValidationError error={errors.phone} />
                    <ValidationHint hint="Enter a valid 10-digit Indian mobile number" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formState.email.value}
                    onChange={(e) => setFieldValue('email', e.target.value)}
                    onBlur={() => setFieldTouched('email', true)}
                    className={`h-11 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter email address"
                  />
                  <ValidationError error={errors.email} />
                  <ValidationHint hint="Enter a valid email address" />
                </div>
              </div>
            
              {/* Security Section */}
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900">Security</h3>
                  <p className="text-sm text-gray-600">Account security and login credentials</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formState.password.value}
                      onChange={(e) => setFieldValue('password', e.target.value)}
                      onBlur={() => setFieldTouched('password', true)}
                      className={`h-11 pr-11 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter secure password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 w-11 rounded-r-md hover:bg-gray-100"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <ValidationError error={errors.password} />
                  <ValidationHint hint="Password must be 8+ characters with uppercase, lowercase, number, and special character" />
                </div>
              </div>
              {/* Role & Access Section */}
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900">Role & Access</h3>
                  <p className="text-sm text-gray-600">Define permissions and organizational structure</p>
                </div>
                
                {/* Show info when no managers available */}
                {user?.role === "admin" && formState.role.value === "team_member" && 
                 Array.isArray(managers) && managers.length === 0 && (
                  <div className="bg-gradient-to-br from-[#6366F1]/10 to-[#A855F7]/10 border border-[#6366F1]/20 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-[#6366F1]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">No Managers Available</h4>
                        <p className="mt-1 text-sm text-gray-700">
                          You can create this team member without a manager assignment, or create managers first using the "Manager" role option above.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={formState.role.value} 
                      onValueChange={(value) => setFieldValue('role', value)}
                    >
                      <SelectTrigger className={`h-11 ${errors.role ? 'border-red-500' : 'border-gray-300'}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        {user?.role === "admin" && <SelectItem value="manager">Manager</SelectItem>}
                        {user?.role === "admin" && <SelectItem value="client">Client</SelectItem>}
                      </SelectContent>
                    </Select>
                    <ValidationError error={errors.role} />
                    <ValidationHint hint="Select the appropriate role for the team member" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={formState.status.value} 
                      onValueChange={(value) => setFieldValue('status', value)}
                    >
                      <SelectTrigger className="h-11 border-gray-300">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <ValidationHint hint="Select the initial status for the team member" />
                  </div>
                </div>
                
                {user?.role === "admin" && formState.role.value === "team_member" && (
                  <div className="space-y-2">
                    <Label htmlFor="manager" className="text-sm font-medium text-gray-700">
                      Assign Manager (Optional)
                    </Label>
                    <div className="space-y-2">
                      <Select
                        value={formState.managerId.value || "none"}
                        onValueChange={(value) => setFieldValue('managerId', value === "none" ? "" : value)}
                      >
                        <SelectTrigger className={`h-11 ${errors.managerId ? 'border-red-500' : 'border-gray-300'}`}>
                          <SelectValue placeholder={
                            Array.isArray(managers) && managers.length > 0 
                              ? "Select manager (optional)" 
                              : "No managers available"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Manager</SelectItem>
                          {Array.isArray(managers) && managers.length > 0 ? (
                            managers.map((manager: any) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.name}
                              </SelectItem>
                            ))
                          ) : null}
                        </SelectContent>
                      </Select>
                      {Array.isArray(managers) && managers.length === 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFieldValue('role', 'manager')
                            toast({
                              title: "Info",
                              description: "Role changed to Manager. You can create a manager first, then create team members.",
                            })
                          }}
                          className="w-full border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10 hover:border-[#4F46E5]"
                        >
                          Create Manager Instead
                        </Button>
                      )}
                    </div>
                    <ValidationError error={errors.managerId} />
                    <ValidationHint hint={
                      Array.isArray(managers) && managers.length > 0
                        ? "Select a manager for the team member (optional)"
                        : "No managers available in your domain. You can create a manager first or create this team member without a manager assignment."
                    } />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none sm:w-auto order-2 sm:order-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !isValid}
                className="flex-1 sm:flex-none sm:w-auto order-1 sm:order-2 min-w-[200px] bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : !isValid ? (
                  "Please fill all required fields"
                ) : (
                  "Create Team Member"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
