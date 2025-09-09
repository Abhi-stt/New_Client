"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Calendar, Target, User, TrendingUp, Clock } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  assigneeId: any
  createdBy: any
  clientId?: any
  serviceId?: any
  currentProgress: number
  lastProgressUpdate?: string
}

interface ProgressUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onSuccess: () => void
}

export function ProgressUpdateDialog({ open, onOpenChange, task, onSuccess }: ProgressUpdateDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [percentage, setPercentage] = useState<number>(0)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [isEndOfDay, setIsEndOfDay] = useState(false)
  const [suggestedPercentage, setSuggestedPercentage] = useState<number>(0)

  useEffect(() => {
    if (task && open) {
      setPercentage(task.currentProgress || 0)
      setNotes("")
      setIsEndOfDay(false)
      
      // Suggest next progress increment (5% steps)
      const current = task.currentProgress || 0
      const suggested = Math.min(current + 5, 100)
      setSuggestedPercentage(suggested)
    }
  }, [task, open])

  const handlePercentageChange = (value: string) => {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setPercentage(numValue)
    }
  }

  const handleQuickSet = (value: number) => {
    setPercentage(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task || !user?.id) return
    
    // Validate progress cannot go backwards
    if (percentage < task.currentProgress) {
      toast({
        title: "Error",
        description: `Progress cannot go backwards. Current progress is ${task.currentProgress}%`,
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(api.taskProgressUpdate(task.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentage,
          notes,
          userId: user.id,
          isEndOfDay
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        toast({
          title: "Success",
          description: `Progress updated to ${percentage}%`
        })
        
        // Reset form
        setNotes("")
        setIsEndOfDay(false)
        
        // Close dialog and refresh
        onOpenChange(false)
        onSuccess()
        
        // Show end-of-day reminder if this was an end-of-day update
        if (isEndOfDay) {
          toast({
            title: "End of Day Update",
            description: "Great job! Your end-of-day progress has been recorded.",
            variant: "default"
          })
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update progress")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const canUpdateProgress = task && (
    task.assigneeId?.id === user?.id || 
    task.assigneeId?._id === user?.id || 
    task.assigneeId === user?.id
  ) && task.status !== 'completed' && task.status !== 'approved'

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Update Task Progress</DialogTitle>
          <DialogDescription>
            Track your progress on this task. You can update progress multiple times per day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.description && (
                <p className="text-gray-600">{task.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>
                    <span className="font-medium">Assignee:</span> {task.assigneeId?.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>
                    <span className="font-medium">Due:</span> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                {task.clientId && (
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span>
                      <span className="font-medium">Client:</span> {task.clientId.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Current Progress Display */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Current Progress</span>
                  <span className="text-sm text-gray-600">{task.currentProgress}%</span>
                </div>
                <Progress value={task.currentProgress} className="w-full" />
                {task.lastProgressUpdate && (
                  <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>Last updated: {new Date(task.lastProgressUpdate).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permission Check */}
          {!canUpdateProgress && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <div className="h-2 w-2 bg-yellow-600 rounded-full"></div>
                  <span className="text-sm">
                    {task.status === 'completed' || task.status === 'approved'
                      ? "Cannot update progress on completed or approved tasks"
                      : "You can only update progress on tasks assigned to you"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Update Form */}
          {canUpdateProgress && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Progress Input */}
              <div>
                <Label htmlFor="percentage">Progress Percentage *</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => handlePercentageChange(e.target.value)}
                    className="w-24"
                    required
                  />
                  <span className="text-gray-600">%</span>
                </div>
                
                {/* Quick Set Buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSet(suggestedPercentage)}
                    className="text-xs"
                  >
                    +5% ({suggestedPercentage}%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSet(25)}
                    className="text-xs"
                  >
                    25%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSet(50)}
                    className="text-xs"
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSet(75)}
                    className="text-xs"
                  >
                    75%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSet(100)}
                    className="text-xs"
                  >
                    100%
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Progress Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe what you accomplished, any challenges, or next steps..."
                  rows={3}
                />
              </div>

              {/* End of Day Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isEndOfDay"
                  checked={isEndOfDay}
                  onChange={(e) => setIsEndOfDay(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isEndOfDay" className="text-sm">
                  This is my end-of-day progress update
                </Label>
              </div>

              {/* Progress Preview */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progress Preview</span>
                  <span className="text-sm text-gray-600">{percentage}%</span>
                </div>
                <Progress value={percentage} className="w-full" />
                <div className="mt-2 text-xs text-gray-500">
                  {percentage > task.currentProgress ? (
                    <span className="text-green-600">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      Progress will increase by {percentage - task.currentProgress}%
                    </span>
                  ) : percentage === task.currentProgress ? (
                    <span className="text-gray-600">No change in progress</span>
                  ) : (
                    <span className="text-red-600">Progress cannot go backwards</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || percentage < task.currentProgress}
                >
                  {loading ? "Updating..." : "Update Progress"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
