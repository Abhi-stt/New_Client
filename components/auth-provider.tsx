"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HOST_URL } from "@/lib/api"

interface User {
  id: string
  email: string
  name: string
  role: "admin" | "manager" | "team_member" | "client"
  managerId?: string
  clientIds?: string[]
  firmIds?: string[]
  phone?: string
  twoFactorEnabled: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, twoFactorCode?: string) => Promise<boolean | '2fa-required'>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

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
    localStorage.removeItem("user")
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
