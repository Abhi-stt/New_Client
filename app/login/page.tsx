"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-provider"
import { Eye, EyeOff, Shield } from "lucide-react"
import { HOST_URL } from "@/lib/api"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const success = await login(email, password, twoFactorCode)

    if (success) {
      router.push("/dashboard")
    } else {
      if (!show2FA && email && password) {
        // Check if 2FA is required
        const response = await fetch(`${HOST_URL}/api/users/check-2fa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        const data = await response.json()
        if (data.requires2FA) {
          setShow2FA(true)
          setError("Please enter your 2FA code")
        } else {
          setError("Invalid credentials")
        }
      } else {
        setError("Invalid credentials or 2FA code")
      }
    }
    setLoading(false)
  }

  const demoCredentials = [
    { role: "Admin", email: "admin@demo.com", password: "admin123" },
    { role: "Manager", email: "manager@demo.com", password: "manager123" },
    { role: "Team Member", email: "team@demo.com", password: "team123" },
    { role: "Client", email: "client@demo.com", password: "client123" },
  ]

  const fillDemo = (email: string, password: string) => {
    setEmail(email)
    setPassword(password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Client Portal</h2>
          <p className="mt-2 text-sm text-gray-600">CA Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>Enter your credentials to access the portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
              </div>

              {show2FA && (
                <div>
                  <Label htmlFor="twoFactorCode">2FA Code</Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {demoCredentials.map((cred) => (
                <Button
                  key={cred.role}
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo(cred.email, cred.password)}
                  className="text-xs"
                >
                  {cred.role}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Click any role to auto-fill credentials</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
