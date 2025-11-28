"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Gavel,
  Scale,
  CalendarClock,
  AlarmClock,
  BellRing,
  FileText,
  Users,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  Filter,
  Search,
  Plus,
  Link2,
  Mail,
  Phone,
  BookOpenCheck,
  Inbox,
  CalendarDays,
  UserPlus,
  Target,
  Trash2,
} from "lucide-react"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import { api, HOST_URL } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

const CASE_TYPE_OPTIONS = [
  "IT Notice",
  "GST Appeal",
  "Audit Objection",
  "Scrutiny",
  "ITAT",
  "CIT(A)",
  "ROC",
  "NFAC",
  "High Court",
  "Other",
]

const CASE_STATUS_OPTIONS = ["pending", "in_progress", "submitted", "closed"]

const CASE_CATEGORY_OPTIONS = [
  "Assessment",
  "Litigation",
  "Compliance",
  "Advisory",
  "Representation",
  "Other",
]

const AUTHORITY_OPTIONS = [
  "Income Tax Dept",
  "GST Dept",
  "Tribunal",
  "ROC",
  "NFAC",
  "Customs",
  "Other",
]

const HEARING_TYPE_OPTIONS = [
  { value: "physical", label: "Physical" },
  { value: "online", label: "Online" },
]

const HEARING_OUTCOME_OPTIONS = [
  { value: "submission_pending", label: "Submission Pending" },
  { value: "adjourned", label: "Adjourned" },
  { value: "clarification_required", label: "Clarification Required" },
  { value: "completed", label: "Completed" },
  { value: "order_received", label: "Order Received" },
]

const REMINDER_CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
]

interface ClientSummary {
  id: string
  name: string
}

interface TeamMember {
  id: string
  name: string
  email: string
}

interface CaseDocument {
  category: string
  label: string
  url: string
  originalName?: string
  uploadedAt?: string
}

interface TimelineEntry {
  entryType: string
  title: string
  description?: string
  date?: string
  files?: CaseDocument[]
}

interface CaseRecord {
  id: string
  caseTitle: string
  caseType: string
  status: string
  caseCategory?: string
  caseNumber?: string
  authorityName?: string
  clientSnapshot?: { name: string; email?: string; phone?: string }
  clientRefId?: string
  dueDate?: string
  replyDueDate?: string
  nextHearingDate?: string
  startDate?: string
  documents?: CaseDocument[]
  reminderPreferences?: {
    channels?: string[]
    daysBeforeHearing?: number
    daysBeforeDue?: number
    daysBeforeReply?: number
  }
  timeline?: TimelineEntry[]
  internalNotes?: string
}

interface HearingRecord {
  id: string
  caseId: string
  caseTitle: string
  clientSnapshot?: { name: string }
  hearingDate: string
  hearingType?: string
  officerName?: string
  benchName?: string
  purpose?: string
  outcome?: string
  notes?: string
  nextHearingDate?: string
  attachments?: CaseDocument[]
}

interface CaseStats {
  totals: {
    totalCases: number
    pendingCases: number
    submittedCases: number
    closedCases: number
  }
  todaysHearings: HearingRecord[]
  upcomingHearings: HearingRecord[]
  deadlines: CaseRecord[]
  replyDeadlines: CaseRecord[]
  noticeAlerts: CaseRecord[]
  submissionAlerts: CaseRecord[]
  clientCaseCounts: { clientName: string; total: number }[]
}

interface ComplianceSummary {
  total: number
  completed: number
  pending: number
  overdue: number
  upcoming: number
  byCategory?: Record<string, number>
  byPriority?: Record<string, number>
  recurring?: any[]
  upcomingItems?: any[]
}

type FileMap = Record<string, File[]>

type CaseReportFilters = {
  clientId: string
  status: string
  caseType: string
  authority: string
}

const exportToCSV = (rows: Record<string, any>[], headers: { key: string; label: string }[], filename: string) => {
  if (!rows.length) return
  const csvRows = [
    headers.map((header) => `"${header.label.replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header.key]
          if (value === undefined || value === null) return '""'
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(","),
    ),
  ]
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function CaseHearingManagement() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null)
  const [hearings, setHearings] = useState<HearingRecord[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [caseReportRows, setCaseReportRows] = useState<any[]>([])
  const [hearingReportRows, setHearingReportRows] = useState<any[]>([])
  const [caseReportFilters, setCaseReportFilters] = useState<CaseReportFilters>({
    clientId: "all",
    status: "all",
    caseType: "all",
    authority: "all",
  })
  const [caseFilters, setCaseFilters] = useState({
    status: "all",
    caseType: "all",
    authority: "all",
    clientId: "all",
  })
  const [caseSearch, setCaseSearch] = useState("")
  const [hearingRange, setHearingRange] = useState("all")
  const [activeTab, setActiveTab] = useState("overview")

  const [caseForm, setCaseForm] = useState({
    caseTitle: "",
    clientId: "",
    caseType: "",
    caseCategory: "",
    caseNumber: "",
    authorityName: "",
    authorityType: "",
    officerName: "",
    officeAddress: "",
    departmentRequirement: "",
    startDate: "",
    dueDate: "",
    replyDueDate: "",
    nextHearingDate: "",
    status: "pending",
    internalNotes: "",
    tags: "",
    reminderDaysBeforeDue: 3,
    reminderDaysBeforeReply: 2,
    reminderDaysBeforeHearing: 1,
  })
  const [caseReminderChannels, setCaseReminderChannels] = useState<string[]>(["email"])
  const [caseFiles, setCaseFiles] = useState<FileMap>({
    notice: [],
    reply: [],
    evidence: [],
    order: [],
    other: [],
  })
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])
  const [caseAssignee, setCaseAssignee] = useState("")

  const [hearingForm, setHearingForm] = useState({
    caseId: "",
    hearingDate: "",
    hearingType: "physical",
    officerName: "",
    benchName: "",
    purpose: "",
    outcome: "submission_pending",
    notes: "",
    nextHearingDate: "",
    remindBeforeDays: 1,
  })
  const [hearingReminderChannels, setHearingReminderChannels] = useState<string[]>(["email"])
  const [hearingFiles, setHearingFiles] = useState<{ noteFiles: File[]; orderFiles: File[] }>({
    noteFiles: [],
    orderFiles: [],
  })

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseRecord | null>(null)
  const [selectedCaseHearings, setSelectedCaseHearings] = useState<HearingRecord[]>([])
  const [selectedCaseCompliance, setSelectedCaseCompliance] = useState<ComplianceSummary | null>(null)
  const [clientTaskCache, setClientTaskCache] = useState<Record<string, any[]>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null)

  const [submittingCase, setSubmittingCase] = useState(false)
  const [submittingHearing, setSubmittingHearing] = useState(false)
  const hearingsFormRef = useRef<HTMLDivElement>(null)

  const openHearingFormForCase = (caseId: string) => {
    setHearingForm((prev) => ({ ...prev, caseId }))
    setActiveTab("hearings")
    requestAnimationFrame(() => {
      hearingsFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const filteredCases = useMemo(() => {
    return cases.filter((caseItem) => {
      if (caseFilters.status !== "all" && caseItem.status !== caseFilters.status) return false
      if (caseFilters.caseType !== "all" && caseItem.caseType !== caseFilters.caseType) return false
      if (
        caseFilters.authority !== "all" &&
        caseItem.authorityName &&
        caseItem.authorityName !== caseFilters.authority
      )
        return false
      if (
        caseFilters.clientId !== "all" &&
        caseItem.clientSnapshot &&
        caseItem.clientSnapshot.name !==
          clients.find((client) => client.id === caseFilters.clientId)?.name
      )
        return false
      if (caseSearch) {
        const term = caseSearch.toLowerCase()
        return (
          caseItem.caseTitle.toLowerCase().includes(term) ||
          caseItem.caseNumber?.toLowerCase().includes(term) ||
          caseItem.clientSnapshot?.name?.toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [cases, caseFilters, caseSearch, clients])

  const fetchJSON = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || errorData.message || "Request failed")
    }
    return response.json()
  }

  const fetchCases = async () => {
    if (!user) return
    const data = await fetchJSON(
      `${api.cases}?role=${encodeURIComponent(user.role)}&userId=${user.id}`,
    )
    setCases(data || [])
  }

  const fetchHearings = async (rangeValue = hearingRange) => {
    if (!user) return
    const data = await fetchJSON(
      `${api.hearings}?role=${encodeURIComponent(user.role)}&userId=${user.id}&range=${rangeValue}`,
    )
    setHearings(data || [])
  }

  const fetchStats = async () => {
    if (!user) return
    const data = await fetchJSON(
      `${api.caseStats}?role=${encodeURIComponent(user.role)}&userId=${user.id}`,
    )
    setCaseStats(data)
  }

  const fetchClients = async () => {
    if (!user) return
    const data = await fetchJSON(
      `${api.clients}?role=${encodeURIComponent(user.role)}&userId=${user.id}`,
    )
    const mapped = (data || []).map((client: any) => ({ id: client.id, name: client.name }))
    setClients(mapped)
  }

  const fetchTeam = async () => {
    if (!user) return
    const data = await fetchJSON(
      `${api.teamMembers}?role=${encodeURIComponent(user.role)}&userId=${user.id}`,
    )
    const mapped = (data || []).map((member: any) => ({
      id: member.id,
      name: member.name,
      email: member.email,
    }))
    setTeamMembers(mapped)
  }

  const fetchCaseReport = async (filters?: CaseReportFilters) => {
    if (!user) return
    const activeFilters = filters || caseReportFilters
    const params = new URLSearchParams({
      role: user.role,
      userId: user.id,
    })
    if (activeFilters.clientId !== "all") params.append("clientId", activeFilters.clientId)
    if (activeFilters.status !== "all") params.append("status", activeFilters.status)
    if (activeFilters.caseType !== "all") params.append("caseType", activeFilters.caseType)
    if (activeFilters.authority !== "all") params.append("authorityName", activeFilters.authority)

    const data = await fetchJSON(`${api.caseReports}?${params.toString()}`)
    setCaseReportRows(data.records || [])
  }

  const fetchHearingReport = async (rangeValue = "all") => {
  const handleCaseReportFilterChange = (key: keyof CaseReportFilters, value: string) => {
    const nextFilters = { ...caseReportFilters, [key]: value }
    setCaseReportFilters(nextFilters)
    fetchCaseReport(nextFilters)
  }
    if (!user) return
    const data = await fetchJSON(
      `${api.hearingReports}?role=${encodeURIComponent(user.role)}&userId=${
        user.id
      }&range=${rangeValue}`,
    )
    setHearingReportRows(data.records || [])
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchCases(),
        fetchHearings(),
        fetchStats(),
        fetchClients(),
        fetchTeam(),
        fetchCaseReport(),
        fetchHearingReport(),
      ])
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to load case management data",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadInitialData()
    }
  }, [user])

  const handleCaseFileChange = (category: keyof FileMap, files: FileList | null) => {
    setCaseFiles((prev) => ({
      ...prev,
      [category]: files ? Array.from(files) : [],
    }))
  }

  const handleHearingFileChange = (
    field: keyof typeof hearingFiles,
    files: FileList | null,
  ) => {
    setHearingFiles((prev) => ({
      ...prev,
      [field]: files ? Array.from(files) : [],
    }))
  }

  const handleCaseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    if (!caseForm.caseTitle || !caseForm.clientId || !caseForm.caseType) {
      toast({
        title: "Missing required fields",
        description: "Case title, client and case type are mandatory.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingCase(true)
      const formData = new FormData()
      Object.entries(caseForm).forEach(([key, value]) => {
        if (value) formData.append(key, value as string)
      })
      formData.append("createdBy", user.id)
      if (caseAssignee) {
        formData.append("assigneeId", caseAssignee)
      }
      formData.append("teamAssignments", JSON.stringify(selectedTeamMembers))
      formData.append(
        "reminderPreferences",
        JSON.stringify({
          channels: caseReminderChannels,
          daysBeforeDue: caseForm.reminderDaysBeforeDue,
          daysBeforeReply: caseForm.reminderDaysBeforeReply,
          daysBeforeHearing: caseForm.reminderDaysBeforeHearing,
        }),
      )
      Object.entries(caseFiles).forEach(([category, files]) => {
        const fieldName =
          category === "notice"
            ? "noticeFiles"
            : category === "reply"
              ? "replyFiles"
              : category === "evidence"
                ? "evidenceFiles"
                : category === "order"
                  ? "orderFiles"
                  : "otherFiles"
        files.forEach((file) => formData.append(fieldName, file))
      })

      await fetchJSON(api.cases, {
        method: "POST",
        body: formData,
      })

      toast({ title: "Case created successfully" })
      setCaseForm({
        caseTitle: "",
        clientId: "",
        caseType: "",
        caseCategory: "",
        caseNumber: "",
        authorityName: "",
        authorityType: "",
        officerName: "",
        officeAddress: "",
        departmentRequirement: "",
        startDate: "",
        dueDate: "",
        replyDueDate: "",
        nextHearingDate: "",
        status: "pending",
        internalNotes: "",
        tags: "",
        reminderDaysBeforeDue: 3,
        reminderDaysBeforeReply: 2,
        reminderDaysBeforeHearing: 1,
      })
      setCaseReminderChannels(["email"])
      setSelectedTeamMembers([])
      setCaseAssignee("")
      setCaseFiles({
        notice: [],
        reply: [],
        evidence: [],
        order: [],
        other: [],
      })
      await Promise.all([fetchCases(), fetchStats(), fetchCaseReport()])
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to create case",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setSubmittingCase(false)
    }
  }

  const handleHearingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    if (!hearingForm.caseId || !hearingForm.hearingDate) {
      toast({
        title: "Missing required fields",
        description: "Case and hearing date are mandatory.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingHearing(true)
      const formData = new FormData()
      Object.entries(hearingForm).forEach(([key, value]) => {
        if (value) formData.append(key, value as string)
      })
      formData.append("createdBy", user.id)
      formData.append("reminderChannels", JSON.stringify(hearingReminderChannels))
      hearingFiles.noteFiles.forEach((file) => formData.append("noteFiles", file))
      hearingFiles.orderFiles.forEach((file) => formData.append("orderFiles", file))

      await fetchJSON(api.hearings, {
        method: "POST",
        body: formData,
      })

      toast({ title: "Hearing recorded successfully" })
      setHearingForm({
        caseId: "",
        hearingDate: "",
        hearingType: "physical",
        officerName: "",
        benchName: "",
        purpose: "",
        outcome: "submission_pending",
        notes: "",
        nextHearingDate: "",
        remindBeforeDays: hearingForm.remindBeforeDays,
      })
      setHearingReminderChannels(["email"])
      setHearingFiles({ noteFiles: [], orderFiles: [] })
      await Promise.all([fetchHearings(), fetchStats(), fetchHearingReport()])
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to save hearing",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setSubmittingHearing(false)
    }
  }

  const openCaseDetail = async (caseId: string) => {
    try {
      setSelectedCaseId(caseId)
      setDetailLoading(true)
      const caseDetail = await fetchJSON(`${api.cases}/${caseId}`)
      const resolvedClientId =
        caseDetail.clientId?.id ||
        caseDetail.clientId?._id ||
        (typeof caseDetail.clientId === "string" ? caseDetail.clientId : undefined)
      const clientIdString = resolvedClientId ? String(resolvedClientId) : undefined
      setSelectedCaseDetail({
        ...caseDetail,
        id: caseDetail.id || caseDetail._id,
        clientRefId: clientIdString,
      })

      const caseHearings = await fetchJSON(api.hearingsByCase(caseId))
      setSelectedCaseHearings(caseHearings || [])

      if (clientIdString) {
        try {
          const compliance = await fetchJSON(api.complianceSummary(clientIdString))
          setSelectedCaseCompliance({
            total: compliance.summary?.total || 0,
            completed: compliance.summary?.completed || 0,
            pending: compliance.summary?.pending || 0,
            overdue: compliance.summary?.overdue || 0,
            upcoming: compliance.summary?.upcoming || 0,
            byCategory: compliance.summary?.byCategory || {},
            byPriority: compliance.summary?.byPriority || {},
          })
        } catch {
          setSelectedCaseCompliance(null)
        }

        if (!clientTaskCache[clientIdString]) {
          try {
            const tasksData = await fetchJSON(
              `${api.tasks}?role=${encodeURIComponent(user?.role || "")}&userId=${user?.id}`,
            )
            const filtered = (tasksData || []).filter(
              (task: any) =>
                String(task.clientId?._id || task.clientId?.id || task.clientId) === clientIdString,
            )
            setClientTaskCache((prev) => ({
              ...prev,
              [clientIdString]: filtered,
            }))
          } catch {
            setClientTaskCache((prev) => ({ ...prev, [clientIdString]: [] }))
          }
        }
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to load case detail",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleManualReminder = async (caseId: string) => {
    try {
      await fetchJSON(api.caseManualReminder(caseId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Manual case reminder",
        }),
      })
      toast({ title: "Reminder triggered" })
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to send reminder",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this case and all associated hearings? This action cannot be undone.")

    if (!confirmed) {
      return
    }

    try {
      setDeletingCaseId(caseId)
      await fetchJSON(`${api.cases}/${caseId}`, {
        method: "DELETE",
      })

      if (selectedCaseId === caseId) {
        setSelectedCaseId(null)
        setSelectedCaseDetail(null)
        setSelectedCaseHearings([])
        setSelectedCaseCompliance(null)
      }

      toast({ title: "Case deleted successfully" })

      await Promise.all([
        fetchCases(),
        fetchStats(),
        fetchCaseReport(),
        fetchHearings(hearingRange),
        fetchHearingReport(hearingRange),
      ])
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to delete case",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setDeletingCaseId(null)
    }
  }

  const clientTasks = (clientId?: string) => (clientId ? clientTaskCache[clientId] || [] : [])

  if (!user || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

const renderStatsCard = (title: string, value: number | string, icon: React.ReactNode) => (
    <Card key={title} className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">{icon}</div>
      </CardContent>
    </Card>
  )

  const caseDocumentsByCategory = (docs?: CaseDocument[]) => {
    if (!docs) return {}
    return docs.reduce(
      (acc, doc) => {
        const category = doc.category || "other"
        acc[category] = acc[category] || []
        acc[category].push(doc)
        return acc
      },
      {} as Record<string, CaseDocument[]>,
    )
  }

  const renderDocumentLinks = (docs?: CaseDocument[]) => {
    if (!docs || !docs.length) {
      return <p className="text-sm text-muted-foreground">No documents yet</p>
    }
    return (
      <div className="space-y-2">
        {docs.map((doc, index) => {
          const url =
            doc.url && HOST_URL ? `${HOST_URL}${doc.url}` : doc.url || "#"
          return (
            <a
              key={`${doc.url}-${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-indigo-600 hover:underline"
            >
              <FileText className="h-4 w-4 mr-2" />
              {doc.originalName || doc.label || "Document"}
            </a>
          )
        })}
      </div>
    )
  }

  const overviewCards = caseStats
    ? [
        {
          title: "Today’s Hearings",
          value: caseStats.todaysHearings?.length || 0,
          icon: <CalendarClock className="h-5 w-5" />,
        },
        {
          title: "Upcoming (7 days)",
          value: caseStats.upcomingHearings?.length || 0,
          icon: <AlarmClock className="h-5 w-5" />,
        },
        {
          title: "Deadlines due",
          value: caseStats.deadlines?.length || 0,
          icon: <BellRing className="h-5 w-5" />,
        },
        {
          title: "Total Cases",
          value: caseStats.totals.totalCases,
          icon: <ClipboardList className="h-5 w-5" />,
        },
        {
          title: "Pending Cases",
          value: caseStats.totals.pendingCases,
          icon: <AlertTriangle className="h-5 w-5" />,
        },
        {
          title: "Submitted / Closed",
          value: `${caseStats.totals.submittedCases}/${caseStats.totals.closedCases}`,
          icon: <CheckCircle2 className="h-5 w-5" />,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cases & Hearings</h1>
          <p className="text-muted-foreground text-sm">
            Track notices, hearings, deadlines, and departmental submissions in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/clients")}>
            <Users className="h-4 w-4 mr-2" />
            Client Management
          </Button>
          <Button onClick={() => router.push("/tasks")} className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
            <ClipboardList className="h-4 w-4 mr-2" />
            Task Console
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 p-2 shadow-sm w-full overflow-hidden">
          {[
            { value: "overview", label: "Overview" },
            { value: "cases", label: "Cases" },
            { value: "hearings", label: "Hearings" },
            { value: "reports", label: "Reports" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-sm sm:text-base font-semibold transition focus-visible:ring-0 focus-visible:ring-offset-0",
                activeTab === tab.value
                  ? "bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white shadow-lg shadow-[#6366F1]/30"
                  : "text-muted-foreground bg-card/70 hover:bg-card dark:bg-slate-900/50"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {overviewCards.map((card) =>
              renderStatsCard(card.title, card.value, card.icon),
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-indigo-500" />
                  Today’s Hearings
                </CardTitle>
                <CardDescription>Physical and online hearings scheduled for today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseStats?.todaysHearings?.length ? (
                  caseStats.todaysHearings.map((hearing) => (
                    <div key={hearing.id} className="p-3 rounded-lg border flex justify-between items-center">
                      <div>
                        <p className="font-medium">{hearing.caseTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {hearing.clientSnapshot?.name} • {hearing.hearingType}
                        </p>
                      </div>
                      <Badge className="capitalize">{hearing.outcome?.replace(/_/g, " ")}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hearings scheduled today</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlarmClock className="h-5 w-5 text-violet-500" />
                  Upcoming hearings (7 days)
                </CardTitle>
                <CardDescription>Stay on top of next week’s appearances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseStats?.upcomingHearings?.length ? (
                  caseStats.upcomingHearings.map((hearing) => (
                    <div key={hearing.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">{hearing.caseTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(hearing.hearingDate).toLocaleDateString()} • {hearing.officerName || "Officer TBD"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          openHearingFormForCase(hearing.caseId)
                          openCaseDetail(hearing.caseId)
                        }}
                      >
                        Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hearings in the next 7 days</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Deadlines & Reply Due Dates</CardTitle>
                <CardDescription>Upcoming submissions and replies for notices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseStats?.deadlines?.length ? (
                  caseStats.deadlines.map((caseItem) => (
                    <div key={caseItem.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{caseItem.caseTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {caseItem.authorityName} • {caseItem.caseType}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          Due {caseItem.dueDate ? new Date(caseItem.dueDate).toLocaleDateString() : "NA"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No deadlines this week</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Notice & Submission Alerts</CardTitle>
                <CardDescription>Pending notices and escalations awaiting response</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Notice Alerts</p>
                  {caseStats?.noticeAlerts?.length ? (
                    caseStats.noticeAlerts.map((caseItem, index) => {
                      const alertKey =
                        caseItem?.id || caseItem?._id || caseItem?.caseNumber || `notice-${index}`
                      return (
                      <div key={alertKey} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{caseItem.caseTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            Notices: {caseItem.documents?.filter((doc) => doc.category === "notice").length || 0}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openCaseDetail(caseItem.id)}>
                          View
                        </Button>
                      </div>
                    )})
                  ) : (
                    <p className="text-sm text-muted-foreground">No notice alerts</p>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Submission Alerts</p>
                  {caseStats?.submissionAlerts?.length ? (
                    caseStats.submissionAlerts.map((caseItem, index) => {
                      const submissionKey =
                        caseItem?.id || caseItem?._id || caseItem?.caseNumber || `submission-${index}`
                      return (
                      <div key={submissionKey} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{caseItem.caseTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {caseItem.dueDate ? new Date(caseItem.dueDate).toLocaleDateString() : "NA"}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => openCaseDetail(caseItem.id)}>
                          Review
                        </Button>
                      </div>
                    )})
                  ) : (
                    <p className="text-sm text-muted-foreground">No submission alerts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Client-wise case distribution</CardTitle>
              <CardDescription>Top clients by active litigation and departmental workload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseStats?.clientCaseCounts?.length ? (
                caseStats.clientCaseCounts.map((item) => (
                  <div key={item.clientName} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-indigo-50">
                        <Gavel className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.clientName || "Unassigned"}</p>
                        <p className="text-xs text-muted-foreground">Total cases: {item.total}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => router.push("/clients")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No client data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Add Case</CardTitle>
                <CardDescription>Capture notices, departmental replies, and assignments.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCaseSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Case Title</Label>
                      <Input
                        value={caseForm.caseTitle}
                        onChange={(e) => setCaseForm({ ...caseForm, caseTitle: e.target.value })}
                        placeholder="e.g., GST Appeal on GSTR-3B order"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select
                        value={caseForm.clientId}
                        onValueChange={(value) => setCaseForm({ ...caseForm, clientId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Case Type</Label>
                      <Select
                        value={caseForm.caseType}
                        onValueChange={(value) => setCaseForm({ ...caseForm, caseType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CASE_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Case Category</Label>
                      <Select
                        value={caseForm.caseCategory}
                        onValueChange={(value) => setCaseForm({ ...caseForm, caseCategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CASE_CATEGORY_OPTIONS.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Authority</Label>
                      <Select
                        value={caseForm.authorityName}
                        onValueChange={(value) => setCaseForm({ ...caseForm, authorityName: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select authority" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTHORITY_OPTIONS.map((authority) => (
                            <SelectItem key={authority} value={authority}>
                              {authority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Case Number</Label>
                      <Input
                        value={caseForm.caseNumber}
                        onChange={(e) => setCaseForm({ ...caseForm, caseNumber: e.target.value })}
                        placeholder="Authority case ref"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Officer Name / Bench</Label>
                      <Input
                        value={caseForm.officerName}
                        onChange={(e) => setCaseForm({ ...caseForm, officerName: e.target.value })}
                        placeholder="Officer or Bench"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Office Address</Label>
                      <Input
                        value={caseForm.officeAddress}
                        onChange={(e) => setCaseForm({ ...caseForm, officeAddress: e.target.value })}
                        placeholder="Office / Tribunal address"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={caseForm.startDate}
                        onChange={(e) => setCaseForm({ ...caseForm, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={caseForm.dueDate}
                        onChange={(e) => setCaseForm({ ...caseForm, dueDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reply Due Date</Label>
                      <Input
                        type="date"
                        value={caseForm.replyDueDate}
                        onChange={(e) => setCaseForm({ ...caseForm, replyDueDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Next Hearing Date</Label>
                      <Input
                        type="date"
                        value={caseForm.nextHearingDate}
                        onChange={(e) => setCaseForm({ ...caseForm, nextHearingDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Case Status</Label>
                    <Select
                      value={caseForm.status}
                      onValueChange={(value) => setCaseForm({ ...caseForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CASE_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Internal Notes / Assignments</Label>
                    <Textarea
                      value={caseForm.internalNotes}
                      onChange={(e) => setCaseForm({ ...caseForm, internalNotes: e.target.value })}
                      placeholder="Internal notes or instructions for the team"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Lead owner</Label>
                      <Select value={caseAssignee} onValueChange={setCaseAssignee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Collaborators</Label>
                      <ScrollArea className="h-32 border rounded-md p-3">
                        <div className="space-y-2">
                          {teamMembers.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedTeamMembers.includes(member.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedTeamMembers((prev) =>
                                    checked
                                      ? [...prev, member.id]
                                      : prev.filter((id) => id !== member.id),
                                  )
                                }}
                              />
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Document Uploads</Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Notice</p>
                        <Input type="file" multiple onChange={(e) => handleCaseFileChange("notice", e.target.files)} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Replies</p>
                        <Input type="file" multiple onChange={(e) => handleCaseFileChange("reply", e.target.files)} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Evidence</p>
                        <Input type="file" multiple onChange={(e) => handleCaseFileChange("evidence", e.target.files)} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Orders</p>
                        <Input type="file" multiple onChange={(e) => handleCaseFileChange("order", e.target.files)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Reminder Channels & Windows</Label>
                    <div className="flex flex-wrap gap-3">
                      {REMINDER_CHANNEL_OPTIONS.map((channel) => (
                        <div key={channel.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={caseReminderChannels.includes(channel.value)}
                            onCheckedChange={(checked) =>
                              setCaseReminderChannels((prev) =>
                                checked
                                  ? [...prev, channel.value]
                                  : prev.filter((value) => value !== channel.value),
                              )
                            }
                          />
                          <Label className="text-sm">{channel.label}</Label>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label className="text-xs">Submission reminders (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={caseForm.reminderDaysBeforeDue}
                          onChange={(e) =>
                            setCaseForm({ ...caseForm, reminderDaysBeforeDue: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Reply reminders (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={caseForm.reminderDaysBeforeReply}
                          onChange={(e) =>
                            setCaseForm({ ...caseForm, reminderDaysBeforeReply: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hearing reminders (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={caseForm.reminderDaysBeforeHearing}
                          onChange={(e) =>
                            setCaseForm({ ...caseForm, reminderDaysBeforeHearing: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={submittingCase} className="w-full">
                    {submittingCase ? "Saving..." : "Save Case"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Search, filter, and monitor case workload</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search by case title, number, or client"
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select value={caseFilters.status} onValueChange={(value) => setCaseFilters((prev) => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        {CASE_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={caseFilters.caseType} onValueChange={(value) => setCaseFilters((prev) => ({ ...prev, caseType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Case type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {CASE_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={caseFilters.authority} onValueChange={(value) => setCaseFilters((prev) => ({ ...prev, authority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Authority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All authorities</SelectItem>
                        {AUTHORITY_OPTIONS.map((authority) => (
                          <SelectItem key={authority} value={authority}>
                            {authority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={caseFilters.clientId} onValueChange={(value) => setCaseFilters((prev) => ({ ...prev, clientId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
                <CardHeader>
                  <CardTitle>Cases</CardTitle>
                  <CardDescription>Unified view of notices, hearings, and submissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredCases.length ? (
                    filteredCases.map((caseItem) => (
                      <div key={caseItem.id} className="border rounded-xl p-4 space-y-3 hover:shadow-sm transition">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{caseItem.caseTitle}</h3>
                              <Badge variant="outline" className="capitalize">
                                {caseItem.caseType}
                              </Badge>
                              {caseItem.documents?.some((doc) => doc.category === "notice") && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Notice</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {caseItem.clientSnapshot?.name} • {caseItem.authorityName || "Authority TBD"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              className={`capitalize ${
                                caseItem.status === "closed"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                                  : caseItem.status === "in_progress"
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {caseItem.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Due Date</p>
                            <p className="font-medium">
                              {caseItem.dueDate ? new Date(caseItem.dueDate).toLocaleDateString() : "NA"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Next Hearing</p>
                            <p className="font-medium">
                              {caseItem.nextHearingDate
                                ? new Date(caseItem.nextHearingDate).toLocaleDateString()
                                : "Awaiting"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Documents stored</p>
                            <p className="font-medium">{caseItem.documents?.length || 0} files</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => openCaseDetail(caseItem.id)}>
                            View timeline
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openHearingFormForCase(caseItem.id)}
                          >
                            <Gavel className="h-4 w-4 mr-1" />
                            Add hearing
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleManualReminder(caseItem.id)}>
                            <BellRing className="h-4 w-4 mr-1" />
                            Reminder
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => handleDeleteCase(caseItem.id)}
                            disabled={deletingCaseId === caseItem.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deletingCaseId === caseItem.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Gavel className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No cases match your current filters.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hearings" className="space-y-6">
          <div ref={hearingsFormRef} className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Record Hearing</CardTitle>
                <CardDescription>Attach bench notes, adjournments, and orders.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleHearingSubmit}>
                  <div className="space-y-2">
                    <Label>Case</Label>
                    <Select
                      value={hearingForm.caseId}
                      onValueChange={(value) => setHearingForm({ ...hearingForm, caseId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select case" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((caseItem) => (
                          <SelectItem key={caseItem.id} value={caseItem.id}>
                            {caseItem.caseTitle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Hearing date</Label>
                      <Input
                        type="datetime-local"
                        value={hearingForm.hearingDate}
                        onChange={(e) => setHearingForm({ ...hearingForm, hearingDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <Select
                        value={hearingForm.hearingType}
                        onValueChange={(value) => setHearingForm({ ...hearingForm, hearingType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HEARING_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Officer / Bench</Label>
                      <Input
                        value={hearingForm.officerName}
                        onChange={(e) => setHearingForm({ ...hearingForm, officerName: e.target.value })}
                        placeholder="Officer or Bench name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Outcome</Label>
                      <Select
                        value={hearingForm.outcome}
                        onValueChange={(value) => setHearingForm({ ...hearingForm, outcome: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HEARING_OUTCOME_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Input
                      value={hearingForm.purpose}
                      onChange={(e) => setHearingForm({ ...hearingForm, purpose: e.target.value })}
                      placeholder="Purpose of hearing"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Officer / Bench Notes</Label>
                    <Textarea
                      value={hearingForm.notes}
                      onChange={(e) => setHearingForm({ ...hearingForm, notes: e.target.value })}
                      placeholder="Record observations, clarifications sought, or documents filed."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Hearing notes upload</Label>
                      <Input type="file" multiple onChange={(e) => handleHearingFileChange("noteFiles", e.target.files)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Order upload</Label>
                      <Input type="file" multiple onChange={(e) => handleHearingFileChange("orderFiles", e.target.files)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Reminder channels</Label>
                    <div className="flex flex-wrap gap-3">
                      {REMINDER_CHANNEL_OPTIONS.map((channel) => (
                        <div key={channel.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={hearingReminderChannels.includes(channel.value)}
                            onCheckedChange={(checked) =>
                              setHearingReminderChannels((prev) =>
                                checked
                                  ? [...prev, channel.value]
                                  : prev.filter((value) => value !== channel.value),
                              )
                            }
                          />
                          <Label className="text-sm">{channel.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Reminder lead time (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={hearingForm.remindBeforeDays}
                      onChange={(e) => setHearingForm({ ...hearingForm, remindBeforeDays: Number(e.target.value) })}
                    />
                  </div>

                  <Button type="submit" disabled={submittingHearing} className="w-full">
                    {submittingHearing ? "Saving..." : "Save Hearing"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Hearing Tracker</CardTitle>
                <CardDescription>Monitor adjournments, clarifications, and bench orders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">View</Label>
                  <Select
                    value={hearingRange}
                    onValueChange={(value) => {
                      setHearingRange(value)
                      fetchHearings(value)
                      fetchHearingReport(value)
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All hearings</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[420px] pr-4">
                  <div className="space-y-3">
                    {hearings.length ? (
                      hearings.map((hearing) => (
                        <div key={hearing.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{hearing.caseTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(hearing.hearingDate).toLocaleString()} • {hearing.officerName || "Officer TBD"}
                              </p>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {hearing.outcome?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-xs">
                            {hearing.purpose || hearing.notes || "No remarks recorded"}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openCaseDetail(hearing.caseId)}>
                              View case
                            </Button>
                            {hearing.attachments?.length ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600"
                                asChild
                              >
                                <a
                                  href={
                                    hearing.attachments[0].url && HOST_URL
                                      ? `${HOST_URL}${hearing.attachments[0].url}`
                                      : hearing.attachments[0].url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Downloads
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No hearings to show.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Case Report</CardTitle>
              <CardDescription>Export case docket with authority, deadlines, and hearing status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Select
                  value={caseReportFilters.clientId}
                  onValueChange={(value) => handleCaseReportFilterChange("clientId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={caseReportFilters.status}
                  onValueChange={(value) => handleCaseReportFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    {CASE_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={caseReportFilters.caseType}
                  onValueChange={(value) => handleCaseReportFilterChange("caseType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Case type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {CASE_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={caseReportFilters.authority}
                  onValueChange={(value) => handleCaseReportFilterChange("authority", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Authority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All authorities</SelectItem>
                    {AUTHORITY_OPTIONS.map((authority) => (
                      <SelectItem key={authority} value={authority}>
                        {authority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  onClick={() =>
                    exportToCSV(
                      caseReportRows.map((row) => ({
                        ...row,
                        startDate: row.startDate ? new Date(row.startDate).toLocaleDateString() : "",
                        dueDate: row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "",
                        replyDueDate: row.replyDueDate ? new Date(row.replyDueDate).toLocaleDateString() : "",
                        nextHearingDate: row.nextHearingDate
                          ? new Date(row.nextHearingDate).toLocaleDateString()
                          : "",
                      })),
                      [
                        { key: "caseId", label: "Case ID" },
                        { key: "caseTitle", label: "Title" },
                        { key: "client", label: "Client" },
                        { key: "caseType", label: "Type" },
                        { key: "authorityName", label: "Authority" },
                        { key: "status", label: "Status" },
                        { key: "startDate", label: "Start Date" },
                        { key: "dueDate", label: "Due Date" },
                        { key: "replyDueDate", label: "Reply Due" },
                        { key: "nextHearingDate", label: "Next Hearing" },
                      ],
                      "case-report.csv",
                    )
                  }
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Authority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Hearing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseReportRows.slice(0, 10).map((row) => (
                      <TableRow key={row.caseId}>
                        <TableCell className="font-medium">{row.caseTitle}</TableCell>
                        <TableCell>{row.client}</TableCell>
                        <TableCell>{row.authorityName}</TableCell>
                        <TableCell className="capitalize">{row.status}</TableCell>
                        <TableCell>
                          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "NA"}
                        </TableCell>
                        <TableCell>
                          {row.nextHearingDate ? new Date(row.nextHearingDate).toLocaleDateString() : "NA"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 dark:bg-slate-900/70 backdrop-blur">
            <CardHeader>
              <CardTitle>Hearing Report</CardTitle>
              <CardDescription>Export upcoming / past hearings with officer, outcome, and next dates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  variant="outline"
                  onClick={() => fetchHearingReport(hearingRange)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white shadow-lg shadow-[#6366F1]/20"
                  onClick={() =>
                    exportToCSV(
                      hearingReportRows.map((row) => ({
                        ...row,
                        hearingDate: row.hearingDate ? new Date(row.hearingDate).toLocaleString() : "",
                        nextHearingDate: row.nextHearingDate ? new Date(row.nextHearingDate).toLocaleDateString() : "",
                      })),
                      [
                        { key: "hearingId", label: "Hearing ID" },
                        { key: "caseTitle", label: "Case" },
                        { key: "client", label: "Client" },
                        { key: "hearingDate", label: "Hearing Date" },
                        { key: "officerName", label: "Officer" },
                        { key: "outcome", label: "Outcome" },
                        { key: "nextHearingDate", label: "Next Hearing" },
                      ],
                      "hearing-report.csv",
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Hearing Date</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Next Hearing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hearingReportRows.slice(0, 10).map((row) => (
                      <TableRow key={row.hearingId}>
                        <TableCell className="font-medium">{row.caseTitle}</TableCell>
                        <TableCell>{row.client}</TableCell>
                        <TableCell>
                          {row.hearingDate ? new Date(row.hearingDate).toLocaleString() : "NA"}
                        </TableCell>
                        <TableCell>{row.officerName || "—"}</TableCell>
                        <TableCell className="capitalize">{row.outcome?.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          {row.nextHearingDate ? new Date(row.nextHearingDate).toLocaleDateString() : "Awaiting"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedCaseId} onOpenChange={(open) => !open && setSelectedCaseId(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedCaseDetail ? (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-indigo-500" />
                  {selectedCaseDetail.caseTitle}
                </SheetTitle>
                <SheetDescription>
                  {selectedCaseDetail.caseType} • {selectedCaseDetail.authorityName}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Case snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCaseDetail.clientSnapshot?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCaseDetail.authorityName || "Authority TBD"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Due:{" "}
                        {selectedCaseDetail.dueDate
                          ? new Date(selectedCaseDetail.dueDate).toLocaleDateString()
                          : "NA"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Hearing:{" "}
                        {selectedCaseDetail.nextHearingDate
                          ? new Date(selectedCaseDetail.nextHearingDate).toLocaleDateString()
                          : "Awaiting"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Reminder settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Channels</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedCaseDetail.reminderPreferences?.channels || ["email"]).map((channel) => (
                          <Badge key={channel} variant="outline" className="capitalize">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Submission</p>
                        <p className="font-medium text-sm">
                          {selectedCaseDetail.reminderPreferences?.daysBeforeDue || 3} days
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Reply</p>
                        <p className="font-medium text-sm">
                          {selectedCaseDetail.reminderPreferences?.daysBeforeReply || 2} days
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Hearing</p>
                        <p className="font-medium text-sm">
                          {selectedCaseDetail.reminderPreferences?.daysBeforeHearing || 1} day
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Case Documents</CardTitle>
                  <CardDescription>Notice, reply, evidence, orders, and submissions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(caseDocumentsByCategory(selectedCaseDetail.documents)).length ? (
                    Object.entries(caseDocumentsByCategory(selectedCaseDetail.documents)).map(([category, docs]) => (
                      <div key={category}>
                        <p className="text-xs uppercase text-muted-foreground mb-2">{category}</p>
                        {renderDocumentLinks(docs)}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Case Timeline</CardTitle>
                  <CardDescription>Notices, submissions, hearings, and orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 pr-4">
                    <div className="space-y-4">
                      {selectedCaseDetail.timeline?.length ? (
                        selectedCaseDetail.timeline
                          ?.slice()
                          .sort(
                            (a, b) =>
                              new Date(b.date || "").getTime() - new Date(a.date || "").getTime(),
                          )
                          .map((entry, index) => (
                            <div key={index} className="border rounded-lg p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="capitalize">
                                  {entry.entryType.replace(/_/g, " ")}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {entry.date ? new Date(entry.date).toLocaleString() : ""}
                                </p>
                              </div>
                              <p className="font-medium text-sm">{entry.title}</p>
                              <p className="text-xs text-muted-foreground">{entry.description}</p>
                              {entry.files?.length ? (
                                <div className="mt-2 space-y-1">
                                  {entry.files.map((file, idx) => {
                                    const url =
                                      file.url && HOST_URL ? `${HOST_URL}${file.url}` : file.url || "#"
                                    return (
                                      <a
                                        key={`${file.url}-${idx}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                      >
                                        <FileText className="h-3 w-3" />
                                        {file.originalName || file.label || "Attachment"}
                                      </a>
                                    )
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No timeline entries yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Hearings</CardTitle>
                    <CardDescription>Recent and upcoming hearings for this case.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedCaseHearings.length ? (
                      selectedCaseHearings.map((hearing) => (
                        <div key={hearing.id} className="border rounded-lg p-3">
                          <p className="text-sm font-semibold">{new Date(hearing.hearingDate).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {hearing.officerName || "Officer TBD"} • {hearing.hearingType}
                          </p>
                          <p className="text-xs">{hearing.purpose || hearing.notes}</p>
                          <Badge variant="outline" className="mt-2 capitalize">
                            {hearing.outcome?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No hearings recorded.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Compliance & Tasks</CardTitle>
                    <CardDescription>Integrates with compliance tracker and task management.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {selectedCaseCompliance ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-emerald-50">
                          <p className="text-xs text-muted-foreground">Pending</p>
                          <p className="text-lg font-semibold">{selectedCaseCompliance.pending}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-50">
                          <p className="text-xs text-muted-foreground">Upcoming</p>
                          <p className="text-lg font-semibold">{selectedCaseCompliance.upcoming}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-rose-50">
                          <p className="text-xs text-muted-foreground">Overdue</p>
                          <p className="text-lg font-semibold">{selectedCaseCompliance.overdue}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-indigo-50">
                          <p className="text-xs text-muted-foreground">Completed</p>
                          <p className="text-lg font-semibold">{selectedCaseCompliance.completed}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Compliance summary unavailable.</p>
                    )}
                    <Separator />
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Tasks linked to client</p>
                      {clientTasks(selectedCaseDetail.clientRefId)?.length ? (
                        clientTasks(selectedCaseDetail.clientRefId)
                          .slice(0, 3)
                          .map((task: any) => (
                            <div key={task.id} className="py-2 border-b">
                              <p className="text-sm font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.status}</p>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No tasks mapped yet.</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push("/clients")}>
                        <Link2 className="h-4 w-4 mr-1" />
                        Client record
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push("/tasks")}>
                        <ClipboardList className="h-4 w-4 mr-1" />
                        Task board
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

