"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HOST_URL } from "@/lib/api"

interface User {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "manager" | "team_member" | "client"
  managerId?: string
  clientIds?: string[]
  firmIds?: string[]
  phone?: string
  twoFactorEnabled: boolean
}

interface AuthContextType {
  user: User | null
  baseUser: User | null
  viewAsRole: User["role"] | null
  viewAsUser: User | null
  setViewAsRole: (role: User["role"] | null) => void
  setViewAsUser: (user: User | null) => void
  login: (email: string, password: string, twoFactorCode?: string) => Promise<boolean | '2fa-required'>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewAsRole, setViewAsRoleState] = useState<User["role"] | null>(null)
  const [viewAsUser, setViewAsUserState] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const parsedUser: User = JSON.parse(savedUser)
      setUser(parsedUser)

      if (parsedUser.role === "super_admin") {
        const savedViewRole = localStorage.getItem("viewAsRole") as User["role"] | null
        if (savedViewRole) {
          setViewAsRoleState(savedViewRole)
        }
        const savedViewUser = localStorage.getItem("viewAsUser")
        if (savedViewUser) {
          try {
            const viewUser: User = JSON.parse(savedViewUser)
            setViewAsUserState(viewUser)
          } catch (error) {
            console.warn("Failed to parse saved impersonation user", error)
            localStorage.removeItem("viewAsUser")
          }
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user?.role !== "super_admin") {
      if (viewAsRole) {
        setViewAsRoleState(null)
        localStorage.removeItem("viewAsRole")
      }
      if (viewAsUser) {
        setViewAsUserState(null)
        localStorage.removeItem("viewAsUser")
      }
    }
  }, [user?.role, viewAsRole, viewAsUser])

  const setViewAsRole = (role: User["role"] | null) => {
    if (user?.role !== "super_admin") return
    setViewAsUserState(null)
    localStorage.removeItem("viewAsUser")
    setViewAsRoleState(role)
    if (role) {
      localStorage.setItem("viewAsRole", role)
    } else {
      localStorage.removeItem("viewAsRole")
    }
  }

  const setViewAsUser = (impersonatedUser: User | null) => {
    if (user?.role !== "super_admin") return
    setViewAsRoleState(null)
    localStorage.removeItem("viewAsRole")
    if (impersonatedUser) {
      setViewAsUserState(impersonatedUser)
      localStorage.setItem("viewAsUser", JSON.stringify(impersonatedUser))
    } else {
      setViewAsUserState(null)
      localStorage.removeItem("viewAsUser")
    }
  }

  const effectiveUser =
    user && user.role === "super_admin" && viewAsRole
      ? { ...user, role: viewAsRole }
      : viewAsUser || user

  const login = async (email: string, password: string, twoFactorCode?: string): Promise<boolean | '2fa-required'> => {
    try {
      const response = await fetch(`${HOST_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, twoFactorCode }),
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
        localStorage.setItem("user", JSON.stringify(userData.user))
        if (userData.user.role === "super_admin") {
          const savedViewRole = localStorage.getItem("viewAsRole") as User["role"] | null
          if (savedViewRole) {
            setViewAsRoleState(savedViewRole)
          }
          const savedViewUser = localStorage.getItem("viewAsUser")
          if (savedViewUser) {
            try {
              const viewUser: User = JSON.parse(savedViewUser)
              setViewAsUserState(viewUser)
            } catch (error) {
              localStorage.removeItem("viewAsUser")
            }
          }
        } else {
          setViewAsRoleState(null)
          localStorage.removeItem("viewAsRole")
          setViewAsUserState(null)
          localStorage.removeItem("viewAsUser")
        }
        return true
      } else if (response.status === 401) {
        const error = await response.json()
        if (error.error === '2FA code required') {
          // Prompt for 2FA code (UI logic to be handled in the login form)
          return '2fa-required';
        }
      }
      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setViewAsRoleState(null)
    setViewAsUserState(null)
    localStorage.removeItem("user")
    localStorage.removeItem("viewAsRole")
    localStorage.removeItem("viewAsUser")
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        baseUser: user,
        viewAsRole: user?.role === "super_admin" ? viewAsRole : null,
        viewAsUser: user?.role === "super_admin" ? viewAsUser : null,
        setViewAsRole,
        setViewAsUser,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
