"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Calendar,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Users,
  X,
  Shield,
  Building,
  CheckSquare,
  Mail,
  LifeBuoy,
  Gavel,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, baseUser, viewAsRole, viewAsUser, setViewAsRole, setViewAsUser, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isViewAsActive = baseUser?.role === "super_admin" && (!!viewAsRole || !!viewAsUser)

  const exitViewMode = () => {
    setViewAsRole(null)
    setViewAsUser(null)
    if (baseUser?.role === "super_admin") {
      router.push("/dashboard?tab=role-access")
    }
  }

  const getNavigationItems = () => {
    const baseItems = [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Cases & Hearings", href: "/cases", icon: Gavel },
      { name: "Documents", href: "/documents", icon: FileText },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Calendar", href: "/calendar", icon: Calendar },
      { name: "Queries", href: "/queries", icon: MessageSquare },
      { name: "Email", href: "/email", icon: Mail },
      { name: "Support Center", href: "/support-center", icon: LifeBuoy },
    ]

    if (user?.role === "super_admin") {
      const hiddenForSuperAdmin = new Set([
        "Cases & Hearings",
        "Documents",
        "Tasks",
        "Calendar",
        "Queries",
        "Email",
        "Super Admin",
        "Team Management",
        "Client Management",
      ])

      return baseItems.filter((item) => !hiddenForSuperAdmin.has(item.name))
    }

    if (user?.role === "admin") {
      return [
        ...baseItems,
        { name: "Team Management", href: "/team", icon: Users },
        { name: "Client Management", href: "/clients", icon: Building },
      ]
    }

    if (user?.role === "manager") {
      return [
        ...baseItems,
        { name: "Team", href: "/team", icon: Users },
        { name: "Clients", href: "/clients", icon: Building },
      ]
    }

    if (user?.role === "client") {
      return [
        ...baseItems,
        { name: "Firms", href: "/firms", icon: Building },
        { name: "Team", href: "/team", icon: Users },
      ]
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),transparent_55%),linear-gradient(to_bottom,rgba(99,102,241,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.75),transparent_60%),linear-gradient(to_bottom,rgba(15,23,42,0.9),transparent)]"
      />
      <div className="relative z-[1] min-h-screen">
        {/* Mobile sidebar */}
        <div className={cn("fixed inset-0 flex z-40 md:hidden", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full border border-border/60 bg-card/95 dark:bg-slate-950/80 backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="text-foreground">
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-foreground">Client Portal</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors",
                    pathname === item.href
                      ? "bg-primary/15 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-border/60 bg-card/80 dark:bg-slate-950/70 backdrop-blur-xl">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-foreground">Client Portal</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname === item.href
                      ? "bg-primary/15 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-transparent">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Top bar */}
        <div className="border-b border-border/70 bg-card/80 dark:bg-slate-950/70 shadow-sm backdrop-blur-xl">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">
                  Welcome, {user?.name}
                </h1>
                <Badge variant="secondary" className="ml-2 capitalize hidden sm:inline-flex">
                  {user?.role?.replace("_", " ")}
                </Badge>
                {isViewAsActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-3 hidden md:inline-flex"
                    onClick={exitViewMode}
                  >
                    Return to Super Admin
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                  <Bell className="h-5 w-5" />
                </Button>
                <ThemeToggle className="border-border/70" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder-user.jpg" alt={user?.name} />
                        <AvatarFallback>
                          {user?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        <Badge variant="secondary" className="capitalize w-fit mt-1 sm:hidden">
                          {user?.role?.replace("_", " ")}
                        </Badge>
                        {isViewAsActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 sm:hidden"
                            onClick={exitViewMode}
                          >
                            Return to Super Admin
                          </Button>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="w-full px-4 sm:px-6 lg:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  </div>
  )
}
