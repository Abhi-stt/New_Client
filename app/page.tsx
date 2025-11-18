"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { HOST_URL } from "@/lib/api"
import {
  Users,
  ClipboardList,
  Calendar,
  FileText,
  BarChart3,
  Mail,
  MessageSquare,
  Building,
  Check,
  ArrowRight,
  Zap,
  Shield,
  Star,
  TrendingUp,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function HomePage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const { toast } = useToast()
  const { user, login, loading: authLoading } = useAuth()
  const router = useRouter()

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirmPassword: "",
    role: "admin" as "admin" | "manager" | "team_member",
  })
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [signupError, setSignupError] = useState("")
  const [signupLoading, setSignupLoading] = useState(false)

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  // Demo request form state
  const [demoForm, setDemoForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  })

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${HOST_URL}/api/demo/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoForm),
      })

      if (response.ok) {
        toast({
          title: "Demo Request Submitted",
          description: "We'll get back to you soon!",
        })
        setDemoOpen(false)
        setDemoForm({ name: "", email: "", phone: "", company: "" })
      } else {
        throw new Error("Failed to submit demo request")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit demo request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")

    const result = await login(loginEmail, loginPassword, show2FA ? twoFactorCode : undefined)
    if (result === true) {
      setLoginOpen(false)
      setLoginEmail("")
      setLoginPassword("")
      setTwoFactorCode("")
      setShow2FA(false)
      router.push("/dashboard")
    } else if (result === "2fa-required") {
      setShow2FA(true)
      setLoginError("Please enter your 2FA code")
    } else {
      setLoginError(show2FA ? "Invalid credentials or 2FA code" : "Invalid credentials")
    }
    setLoginLoading(false)
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupLoading(true)
    setSignupError("")

    // Validation
    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError("Passwords do not match")
      setSignupLoading(false)
      return
    }

    if (signupForm.password.length < 6) {
      setSignupError("Password must be at least 6 characters long")
      setSignupLoading(false)
      return
    }

    if (!agreeToTerms) {
      setSignupError("You must agree to the Terms of Service and Privacy Policy")
      setSignupLoading(false)
      return
    }

    try {
      const response = await fetch(`${HOST_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupForm.name,
          email: signupForm.email,
          phone: signupForm.phone,
          password: signupForm.password,
          role: signupForm.role,
          company: signupForm.company,
        }),
      })

      if (response.ok) {
        toast({
          title: "Account Created Successfully",
          description: "You have been automatically logged in.",
        })
        
        // Automatically login the user after signup
        const loginResult = await login(signupForm.email, signupForm.password)
        if (loginResult === true) {
          setSignupOpen(false)
          setSignupForm({
            name: "",
            email: "",
            phone: "",
            company: "",
            password: "",
            confirmPassword: "",
            role: "admin",
          })
          router.push("/dashboard")
        } else {
          // If auto-login fails, show login dialog
          setSignupOpen(false)
          setLoginOpen(true)
          toast({
            title: "Account Created",
            description: "Please login to continue.",
          })
        }
      } else {
        const errorData = await response.json()
        setSignupError(errorData.error || "Failed to create account. Please try again.")
      }
    } catch (error) {
      setSignupError("An error occurred. Please try again.")
      console.error("Signup error:", error)
    } finally {
      setSignupLoading(false)
    }
  }

  const features = [
    {
      icon: ClipboardList,
      title: "Task Management",
      description: "Create, assign, and track tasks with priority levels, due dates, and status tracking. Perfect for managing workflows and deadlines across your team.",
      color: "#6366F1",
      bgColor: "#EEF2FF",
    },
    {
      icon: FileText,
      title: "Document Management",
      description: "Upload, view, and manage documents with in-browser preview for DOCX, PDF, and images. Secure document sharing with clients and team members.",
      color: "#A78BFA",
      bgColor: "#F5F3FF",
    },
    {
      icon: Calendar,
      title: "Calendar View",
      description: "Google Calendar-like interface for all roles. View tasks, events, and deadlines in an intuitive calendar format with full-screen capability.",
      color: "#6366F1",
      bgColor: "#EEF2FF",
    },
    {
      icon: Users,
      title: "Client Management",
      description: "Manage clients and their information with role-based access. Assign clients to team members and track all client-related activities.",
      color: "#A78BFA",
      bgColor: "#F5F3FF",
    },
    {
      icon: Building,
      title: "Firm Management",
      description: "Organize multiple firms per client, manage firm details, and maintain complete separation of data between different organizations.",
      color: "#6366F1",
      bgColor: "#EEF2FF",
    },
    {
      icon: MessageSquare,
      title: "Query Management",
      description: "Handle client queries and communications efficiently. Track query status, responses, and maintain clear communication channels.",
      color: "#A78BFA",
      bgColor: "#F5F3FF",
    },
    {
      icon: Mail,
      title: "Email Integration",
      description: "Connect Gmail accounts with OAuth2, sync emails automatically, and set up intelligent email forwarding rules based on your preferences.",
      color: "#6366F1",
      bgColor: "#EEF2FF",
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Manage team members, assign roles (Admin, Manager, Team Member), and maintain hierarchical relationships with complete data isolation.",
      color: "#A78BFA",
      bgColor: "#F5F3FF",
    },
    {
      icon: BarChart3,
      title: "Role-Based Dashboards",
      description: "Customized dashboards for each role - Admin, Manager, Team Member, and Client. View relevant metrics and quick actions tailored to your needs.",
      color: "#6366F1",
      bgColor: "#EEF2FF",
    },
  ]

  const testimonials = [
    {
      quote: "This platform has transformed how we manage our workflow. The task management and document sharing features are exceptional.",
      author: "Rahul Kumar",
      role: "CEO, TechSolutions Inc.",
      initials: "RK",
      color: "#6366F1",
    },
    {
      quote: "The calendar integration and team collaboration tools have significantly improved our productivity. Highly recommend!",
      author: "Priya Sharma",
      role: "Director, Global Corp",
      initials: "PS",
      color: "#A78BFA",
    },
    {
      quote: "Outstanding platform with excellent support. The role-based access and security features give us complete peace of mind.",
      author: "Amit Singh",
      role: "Founder, StartupHub",
      initials: "AS",
      color: "#6366F1",
    },
  ]

  const pricingPlans = [
    {
      name: "Free",
      price: "0.00",
      period: "/month",
      description: "Perfect for getting started",
      features: [
        "5 Users",
        "50 Clients",
        "1 GB Storage",
        "Basic Task Management",
        "Document Management",
        "Calendar View",
        "Email Support",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "outline" as const,
      popular: false,
    },
    {
      name: "Standard",
      price: "9,999.00",
      period: "/month",
      description: "Ideal for growing teams",
      features: [
        "15 Users",
        "Unlimited Clients",
        "5 GB Storage",
        "All Task Features",
        "Email Integration",
        "Query Management",
        "Team Management",
        "Priority Support",
      ],
      buttonText: "Get Started",
      buttonVariant: "default" as const,
      popular: true,
    },
    {
      name: "Pro",
      price: "19,999.00",
      period: "/month",
      description: "For established organizations",
      features: [
        "50 Users",
        "Unlimited Clients",
        "20 GB Storage",
        "All Features Included",
        "Advanced Analytics",
        "Custom Integrations",
        "API Access",
        "24/7 Priority Support",
      ],
      buttonText: "Get Started",
      buttonVariant: "default" as const,
      popular: false,
    },
  ]

  const stats = [
    { value: "1000+", label: "Active Users" },
    { value: "50K+", label: "Tasks Managed" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
  ]

  const nextTestimonial = () => {
    setTestimonialIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 via-purple-50/30 to-violet-50/40">
      {/* Navigation */}
      <nav className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-[#0F172A]">Client Portal</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-[#475569] hover:text-[#0F172A] transition-colors font-medium text-sm">
                Features
              </Link>
              <Link href="#pricing" className="text-[#475569] hover:text-[#0F172A] transition-colors font-medium text-sm">
                Pricing
              </Link>
              <Button variant="ghost" onClick={() => setDemoOpen(true)} className="text-[#475569] hover:text-[#0F172A] font-medium text-sm">
                Request Demo
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLoginOpen(true)} 
                className="font-medium text-sm border-slate-200 text-[#475569] hover:border-[#6366F1] hover:text-[#6366F1]"
              >
                Login
              </Button>
              <Button 
                onClick={() => setSignupOpen(true)} 
                className="font-semibold text-sm bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25 rounded-xl"
              >
                Sign Up
              </Button>
            </div>
            <div className="md:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLoginOpen(true)}
                className="font-medium text-sm"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-100/50 via-purple-50/60 to-violet-100/50 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#6366F1]/20 to-[#A855F7]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-[#A78BFA]/20 to-[#6366F1]/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-[#A855F7]/15 to-[#6366F1]/15 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-[#6366F1] mb-8 shadow-sm">
              <Sparkles className="h-4 w-4" />
              <span>Trusted by 1000+ Organizations</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#0F172A] mb-6 leading-tight tracking-tight">
              Streamline Your Business Operations
            </h1>
            <p className="text-xl sm:text-2xl text-[#475569] mb-4 max-w-2xl mx-auto font-normal leading-relaxed">
              Automate and Simplify Your Workflow Management
            </p>
            <p className="text-lg text-[#475569] mb-12 max-w-2xl mx-auto leading-relaxed">
              A comprehensive practice management platform to manage tasks, documents, calendar events, and team collaboration. Built with role-based access for seamless workflow management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                size="lg" 
                onClick={() => setDemoOpen(true)} 
                className="text-base px-8 py-6 h-auto bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-xl shadow-[#6366F1]/25 rounded-xl font-semibold transition-all"
              >
                Request Demo
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setSignupOpen(true)}
                className="text-base px-8 py-6 h-auto border border-slate-300 text-[#475569] hover:bg-white hover:border-[#6366F1] hover:text-[#6366F1] font-semibold rounded-xl transition-all shadow-sm"
              >
                Get Started
              </Button>
            </div>
            
            {/* Stats Section - Glassmorphism */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-white/80 via-purple-50/60 to-indigo-50/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-purple-200/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default"
                >
                  <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#475569] font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="relative container mx-auto px-8 py-20 bg-gradient-to-br from-indigo-100/40 via-purple-50/50 to-violet-100/40 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-64 h-64 bg-[#A78BFA]/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#6366F1]/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-[#A855F7]/12 rounded-full blur-3xl"></div>
        </div>
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#0F172A] mb-4 tracking-tight">Why Choose Our Platform?</h2>
          <p className="text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Built with modern technology and designed for efficiency
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto relative z-10">
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 border border-indigo-200/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Shield className="h-8 w-8 text-[#6366F1]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Secure & Reliable</h3>
            <p className="text-sm text-[#475569] leading-relaxed">Enterprise-grade security with 99.9% uptime guarantee</p>
          </div>
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-white via-purple-50/40 to-violet-50/40 border border-purple-200/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F3FF] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Zap className="h-8 w-8 text-[#A78BFA]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Lightning Fast</h3>
            <p className="text-sm text-[#475569] leading-relaxed">Optimized performance for seamless user experience</p>
          </div>
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 border border-indigo-200/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <TrendingUp className="h-8 w-8 text-[#6366F1]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Scalable Solution</h3>
            <p className="text-sm text-[#475569] leading-relaxed">Grows with your business from startup to enterprise</p>
          </div>
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-white via-purple-50/40 to-violet-50/40 border border-purple-200/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F3FF] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Award className="h-8 w-8 text-[#A78BFA]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Award Winning</h3>
            <p className="text-sm text-[#475569] leading-relaxed">Recognized for excellence in business management</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative container mx-auto px-8 py-20 bg-gradient-to-br from-violet-100/40 via-indigo-50/50 to-purple-100/40 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-[#6366F1]/15 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-[#A855F7]/15 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#A78BFA]/10 via-[#6366F1]/10 to-[#A855F7]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-[#A78BFA]/8 rounded-full blur-3xl"></div>
        </div>
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#0F172A] mb-4 tracking-tight">
            Essential Tools for Effective Management
          </h2>
          <p className="text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Everything you need to manage your workflow, team, and clients in one unified platform
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto relative z-10">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border border-indigo-200/40 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl h-full"
            >
              <CardHeader className="pb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm"
                  style={{ backgroundColor: feature.bgColor }}
                >
                  <feature.icon className="h-7 w-7" style={{ color: feature.color }} />
                </div>
                <CardTitle className="text-xl font-semibold text-[#0F172A]">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-[#475569] leading-relaxed">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative container mx-auto px-8 py-20 bg-gradient-to-br from-indigo-100/40 via-purple-50/50 to-violet-100/40 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 right-1/4 w-72 h-72 bg-gradient-to-br from-[#A855F7]/18 to-[#6366F1]/18 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-gradient-to-tl from-[#A78BFA]/18 to-[#A855F7]/18 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl"></div>
        </div>
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#0F172A] mb-4 tracking-tight">What Our Clients Say</h2>
          <p className="text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Trusted by organizations worldwide
          </p>
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="relative bg-gradient-to-br from-white via-purple-50/50 to-indigo-50/50 rounded-3xl shadow-xl border border-purple-200/40 p-8 lg:p-12 backdrop-blur-sm">
            <div className="flex items-center space-x-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-lg text-[#475569] mb-8 leading-relaxed italic">
              "{testimonials[testimonialIndex].quote}"
            </p>
            <div className="flex items-center space-x-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-semibold shadow-lg"
                style={{ backgroundColor: testimonials[testimonialIndex].color }}
              >
                {testimonials[testimonialIndex].initials}
              </div>
              <div>
                <div className="font-semibold text-[#0F172A]">{testimonials[testimonialIndex].author}</div>
                <div className="text-sm text-[#475569]">{testimonials[testimonialIndex].role}</div>
              </div>
            </div>
            
            {/* Carousel Navigation */}
            <div className="flex items-center justify-center space-x-3 mt-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full w-10 h-10 border border-slate-200 hover:bg-slate-100"
              >
                <ChevronLeft className="h-5 w-5 text-[#475569]" />
              </Button>
              <div className="flex space-x-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === testimonialIndex ? "bg-[#6366F1] w-8" : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full w-10 h-10 border border-slate-200 hover:bg-slate-100"
              >
                <ChevronRight className="h-5 w-5 text-[#475569]" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative container mx-auto px-8 py-20 bg-gradient-to-br from-purple-100/40 via-indigo-50/50 to-violet-100/40 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#6366F1]/18 via-[#A78BFA]/18 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#A855F7]/18 via-[#6366F1]/18 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#A78BFA]/12 rounded-full blur-3xl"></div>
        </div>
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#0F172A] mb-4 tracking-tight">Choose Your Plan</h2>
          <p className="text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Select the perfect plan that fits your team size and business requirements
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto relative z-10">
          {pricingPlans.map((plan, index) => (
            <Card
              key={index}
              className={`relative transition-all duration-300 rounded-3xl ${
                plan.popular
                  ? "border-2 shadow-2xl scale-105 bg-gradient-to-br from-white via-purple-50/50 to-indigo-50/50"
                  : "border border-indigo-200/40 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 shadow-sm hover:shadow-xl"
              }`}
              style={
                plan.popular
                  ? {
                      borderColor: "#6366F1",
                      borderImageSource: "linear-gradient(to bottom, #6366F1, #A855F7)",
                      borderImageSlice: 1,
                    }
                  : {}
              }
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white px-5 py-2 rounded-full text-xs font-semibold shadow-lg shadow-[#6366F1]/25 uppercase tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-6 pt-8">
                <CardTitle className="text-2xl font-bold text-[#0F172A] mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-base text-[#475569] mb-6">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-[#0F172A]">₹{plan.price}</span>
                  <span className="text-lg text-[#475569] ml-2">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-[#6366F1] mt-0.5 flex-shrink-0" />
                      <span className="text-[#475569] text-base leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-6 pb-8">
                <Link href="/signup" className="w-full">
                  <Button
                    variant={plan.buttonVariant}
                    className={`w-full rounded-xl font-semibold ${
                      plan.popular
                        ? "bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white border-0 shadow-lg shadow-[#6366F1]/25"
                        : "border border-slate-300 text-[#475569] hover:bg-slate-50 hover:border-[#6366F1] hover:text-[#6366F1]"
                    }`}
                    size="lg"
                  >
                    {plan.buttonText}
                    {plan.popular && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-8 py-20">
        <div className="relative bg-gradient-to-r from-[#6366F1] to-[#A855F7] rounded-3xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNFY0aC00ek02IDM0di00SDR2NEgwdjJoNHY0aDJ2LTRoNHYtMkg2ek02IDRWMEg0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <div className="relative px-8 sm:px-12 lg:px-16 py-16 lg:py-20 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
              Ready to Transform Your Business Operations?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join organizations who trust our platform to manage their tasks, documents, and client communications with seamless efficiency and reliability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setDemoOpen(true)}
                className="text-base px-8 py-6 h-auto bg-white text-[#6366F1] hover:bg-slate-50 font-semibold rounded-xl shadow-xl"
              >
                Schedule Demo
              </Button>
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 h-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#6366F1] font-semibold rounded-xl backdrop-blur-sm"
                >
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-slate-400 py-16">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Client Portal</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                A full-stack client portal platform for managing tasks, documents, calendar events, and team collaboration. Built with modern technology and role-based access control for secure and efficient workflow management.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-6 text-sm">Quick Links</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#features" className="text-slate-400 hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => setLoginOpen(true)} 
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Login
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setSignupOpen(true)} 
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Sign Up
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-6 text-sm">Contact Us</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>Email: info@clientportal.com</li>
                <li>Phone: +91 12345 67890</li>
                <li>Support: support@clientportal.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm text-slate-500">
            <p>© 2025 Client Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Request Demo Dialog */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">Request a Demo</DialogTitle>
            <DialogDescription className="text-[#475569]">
              Fill in your details and we'll get back to you soon to schedule a personalized demo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDemoSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-[#0F172A] font-medium">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[#0F172A] font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-[#0F172A] font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 12345 67890"
                  value={demoForm.phone}
                  onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company" className="text-[#0F172A] font-medium">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Your Company Name"
                  value={demoForm.company}
                  onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDemoOpen(false)}
                className="border-slate-200 text-[#475569] hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white rounded-xl shadow-lg shadow-[#6366F1]/25"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border-slate-200">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-[#0F172A] text-center">Sign in to your account</DialogTitle>
            <DialogDescription className="text-[#475569] text-center">
              Enter your credentials to access the portal
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLoginSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="login-email" className="text-[#0F172A] font-medium">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="login-password" className="text-[#0F172A] font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1] pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-[#475569]" /> : <Eye className="h-4 w-4 text-[#475569]" />}
                  </Button>
                </div>
              </div>

              {show2FA && (
                <div className="grid gap-2">
                  <Label htmlFor="twoFactorCode" className="text-[#0F172A] font-medium">2FA Code</Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    maxLength={6}
                    className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                  />
                </div>
              )}

              {loginError && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLoginOpen(false)
                  setLoginError("")
                  setShow2FA(false)
                  setLoginEmail("")
                  setLoginPassword("")
                  setTwoFactorCode("")
                }}
                className="border-slate-200 text-[#475569] hover:bg-slate-50 rounded-xl w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loginLoading}
                className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white rounded-xl shadow-lg shadow-[#6366F1]/25 w-full sm:w-auto"
              >
                {loginLoading ? "Signing in..." : "Sign in"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Signup Dialog */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#6366F1]/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-[#0F172A] text-center">Create Your Account</DialogTitle>
            <DialogDescription className="text-[#475569] text-center">
              Sign up to start managing your practice efficiently
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignupSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="signup-name" className="text-[#0F172A] font-medium">Full Name *</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-email" className="text-[#0F172A] font-medium">Email Address *</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="john@example.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-phone" className="text-[#0F172A] font-medium">Phone Number *</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="+91 12345 67890"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-company" className="text-[#0F172A] font-medium">Company Name *</Label>
                <Input
                  id="signup-company"
                  type="text"
                  placeholder="Your Company Name"
                  value={signupForm.company}
                  onChange={(e) => setSignupForm({ ...signupForm, company: e.target.value })}
                  required
                  className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-role" className="text-[#0F172A] font-medium">Role *</Label>
                <Select
                  value={signupForm.role}
                  onValueChange={(value) => setSignupForm({ ...signupForm, role: value as "admin" | "manager" | "team_member" })}
                >
                  <SelectTrigger className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-password" className="text-[#0F172A] font-medium">Password *</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1] pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4 text-[#475569]" /> : <Eye className="h-4 w-4 text-[#475569]" />}
                  </Button>
                </div>
                <p className="text-xs text-[#475569] mt-1">Must be at least 6 characters</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-confirm-password" className="text-[#0F172A] font-medium">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    required
                    className="border-slate-200 rounded-xl focus:border-[#6366F1] focus:ring-[#6366F1] pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-[#475569]" /> : <Eye className="h-4 w-4 text-[#475569]" />}
                  </Button>
                </div>
              </div>

              {signupError && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{signupError}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <Checkbox
                  id="agree-terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="agree-terms"
                  className="text-sm text-[#475569] leading-relaxed cursor-pointer"
                >
                  By signing up, you agree to our{" "}
                  <button
                    type="button"
                    className="text-[#6366F1] hover:text-[#4F46E5] font-medium underline"
                    onClick={(e) => {
                      e.preventDefault()
                      // You can add links to Terms of Service and Privacy Policy here
                    }}
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="text-[#6366F1] hover:text-[#4F46E5] font-medium underline"
                    onClick={(e) => {
                      e.preventDefault()
                      // You can add links to Terms of Service and Privacy Policy here
                    }}
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSignupOpen(false)
                  setSignupError("")
                  setAgreeToTerms(false)
                  setSignupForm({
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    password: "",
                    confirmPassword: "",
                    role: "admin",
                  })
                }}
                className="border-slate-200 text-[#475569] hover:bg-slate-50 rounded-xl w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={signupLoading}
                className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#4F46E5] hover:to-[#9333EA] text-white rounded-xl shadow-lg shadow-[#6366F1]/25 w-full sm:w-auto"
              >
                {signupLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </DialogFooter>
            <div className="text-center text-sm text-[#475569] mt-4">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setSignupOpen(false)
                  setLoginOpen(true)
                }}
                className="text-[#6366F1] hover:text-[#4F46E5] font-medium"
              >
                Sign in
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
