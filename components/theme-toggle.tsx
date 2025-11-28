"use client"

import type { ComponentProps } from "react"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
}

export function ThemeToggle({
  className,
  variant = "outline",
  size = "icon",
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleToggle = () => {
    if (!isMounted) return
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("relative overflow-hidden transition-colors", className)}
      onClick={handleToggle}
      aria-label="Toggle theme"
      disabled={!isMounted}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all",
          resolvedTheme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100",
        )}
      />
      <Moon
        className={cn(
          "absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transition-all",
          resolvedTheme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0",
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

