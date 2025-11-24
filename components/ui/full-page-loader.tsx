"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FullPageLoaderProps {
  label?: string
  className?: string
}

export function FullPageLoader({ label = "Loading...", className }: FullPageLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-10 w-10 animate-spin text-[#6366F1]" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

