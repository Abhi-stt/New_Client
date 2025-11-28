"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FullPageLoader } from "@/components/ui/full-page-loader"
import { HelpCircle, User, Clock } from "lucide-react"

type Role = "super_admin" | "admin" | "manager" | "team_member"

interface TicketResponse {
  text: string
  userName?: string
  userRole?: Role
  createdAt?: string
}

interface Ticket {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  createdAt?: string
  createdById?: string
  createdByName?: string
  createdByRole: Role
  responses: TicketResponse[]
}

const priorityVariant = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
      return "secondary"
    default:
      return "outline"
  }
}

const statusVariant = (status: string) => {
  switch (status) {
    case "resolved":
      return "default"
    case "in_progress":
      return "secondary"
    case "pending":
      return "outline"
    case "closed":
      return "destructive"
    default:
      return "outline"
  }
}

const normalizeId = (value: any) => {
  if (typeof value === "string") return value
  if (value?._id) return value._id
  if (value?.id) return value.id
  return ""
}

const mapTicket = (ticket: any): Ticket => ({
  id: ticket.id ?? ticket._id ?? `${ticket.createdAt ?? Math.random()}`,
  title: ticket.title,
  description: ticket.description,
  category: ticket.category,
  priority: ticket.priority,
  status: ticket.status,
  createdAt: ticket.createdAt,
  createdById: normalizeId(ticket.createdBy),
  createdByName: ticket.createdByName || "Unknown",
  createdByRole:
    ticket.createdByRole ||
    (normalizeId(ticket.createdBy) && normalizeId(ticket.createdBy) === normalizeId(ticket.adminId) ? "admin" : "manager"),
  responses: ticket.responses || [],
})

const filterTicketsByRole = (tickets: Ticket[], role?: Role, userId?: string) => {
  if (!role || !userId) return []
  switch (role) {
    case "super_admin":
      return tickets.filter((ticket) => ticket.createdByRole === "admin")
    case "admin":
      return tickets.filter(
        (ticket) =>
          ticket.createdById === userId || ["manager", "team_member"].includes(ticket.createdByRole),
      )
    case "manager":
    case "team_member":
      return tickets.filter((ticket) => ticket.createdById === userId)
    default:
      return []
  }
}

const canRoleRespond = (ticket: Ticket, role?: Role) => {
  if (!role) return false
  if (role === "super_admin") return ticket.createdByRole === "admin"
  if (role === "admin") return ["manager", "team_member"].includes(ticket.createdByRole)
  return false
}

const canRoleCreateTicket = (role?: Role) => role === "admin" || role === "manager" || role === "team_member"

const getTicketTargetCopy = (role?: Role) => {
  switch (role) {
    case "admin":
      return {
        title: "Escalate to Super Admin",
        description: "Share blockers or escalations that need Super Admin support.",
        button: "Send to Super Admin",
      }
    case "manager":
    case "team_member":
      return {
        title: "Create ticket for Admin",
        description: "Describe the issue. Your Admin will respond and guide you.",
        button: "Send to Admin",
      }
    default:
      return {
        title: "Ticket escalation",
        description: "Only Admins and their teams can create tickets from here.",
        button: "Submit Ticket",
      }
  }
}

const readOnlyMessage = (ticket: Ticket, role?: Role) => {
  if (role === "admin" && ticket.createdByRole === "admin") {
    return "This escalation will be answered by the Super Admin."
  }
  if (role === "manager" || role === "team_member") {
    return "Only your Admin can respond. You'll be notified when they reply."
  }
  if (role === "super_admin") {
    return "View and reply only to Admin escalations."
  }
  return "Replies for this ticket are handled by the Admin."
}

export default function SupportCenterPage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [respondingTicketId, setRespondingTicketId] = useState<string | null>(null)
  const [creatingTicket, setCreatingTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "general",
    priority: "medium",
    message: "",
  })
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user?.id) return
    fetchTickets()
  }, [user?.id, user?.role])

  const fetchTickets = async () => {
    if (!user?.id) return
    setTicketsLoading(true)
    try {
      const response = await fetch(`${api.queries}?role=${user.role}&userId=${user.id}`)
      const data = await response.json()
      const items = Array.isArray(data) ? data : data?.queries || data?.data || []
      setTickets(items.map(mapTicket))
    } catch (error) {
      toast({
        title: "Unable to load tickets",
        description: "Please retry in a moment.",
        variant: "destructive",
      })
      setTickets([])
    } finally {
      setTicketsLoading(false)
    }
  }

  const filteredTickets = useMemo(
    () => filterTicketsByRole(tickets, user?.role as Role, user?.id),
    [tickets, user?.role, user?.id],
  )

  const sortedTickets = useMemo(
    () =>
      [...filteredTickets].sort(
        (a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime(),
      ),
    [filteredTickets],
  )

  const userRole = user?.role as Role | undefined
  const canCreateTicket = canRoleCreateTicket(userRole)
  const ticketCopy = getTicketTargetCopy(userRole)

  const resetNewTicket = () =>
    setNewTicket({
      subject: "",
      category: "general",
      priority: "medium",
      message: "",
    })

  const handleNewTicketSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user?.id || !canCreateTicket) return
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast({
        title: "Missing information",
        description: "Subject and description are required.",
        variant: "destructive",
      })
      return
    }

    setCreatingTicket(true)
    try {
      const payload = {
        title: newTicket.subject.trim(),
        description: newTicket.message.trim(),
        category: newTicket.category,
        priority: newTicket.priority,
        createdBy: user.id,
        createdByName: user.name,
      }
      const response = await fetch(`${api.queries}?role=${user.role}&userId=${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.message || "Failed to create ticket")
      }
      toast({ title: "Ticket sent", description: "We'll notify you when there is an update." })
      resetNewTicket()
      fetchTickets()
    } catch (error: any) {
      toast({
        title: "Could not create ticket",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setCreatingTicket(false)
    }
  }

  const handleResponseDraftChange = (id: string, value: string) => {
    setResponseDrafts((prev) => ({ ...prev, [id]: value }))
  }

  const handleResponseSubmit = async (ticket: Ticket) => {
    if (!user?.id || !userRole) return
    const draft = responseDrafts[ticket.id]?.trim()
    if (!draft) {
      toast({
        title: "Response required",
        description: "Type a reply before sending.",
        variant: "destructive",
      })
      return
    }

    setRespondingTicketId(ticket.id)
    try {
      const response = await fetch(`${api.queryResponses(ticket.id)}?role=${user.role}&userId=${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: draft, userName: user.name }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || "Unable to send reply")
      }
      toast({ title: "Reply sent", description: "Your response has been shared with the requester." })
      setResponseDrafts((prev) => ({ ...prev, [ticket.id]: "" }))
      fetchTickets()
    } catch (error: any) {
      toast({
        title: "Unable to send reply",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setRespondingTicketId(null)
    }
  }

  if (loading) {
    return <FullPageLoader label="Loading support center..." className="min-h-screen" />
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Ticket composer</CardTitle>
            <CardDescription>{ticketCopy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {canCreateTicket ? (
              <form className="space-y-4" onSubmit={handleNewTicketSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="subject">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="Unable to upload GST return"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Category</label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket((prev) => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="client">Client Issue</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="document">Document Upload</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Priority</label>
                    <Select value={newTicket.priority} onValueChange={(value) => setNewTicket((prev) => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="message">
                    Description
                  </label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={newTicket.message}
                    onChange={(e) => setNewTicket((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Include client name, task ID, steps to reproduce..."
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetNewTicket} disabled={creatingTicket}>
                    Clear
                  </Button>
                  <Button type="submit" disabled={creatingTicket}>
                    {creatingTicket ? "Sending..." : ticketCopy.button}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Only Admins and their teams can open tickets from here.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Tickets & Responses</CardTitle>
            <CardDescription>
              {ticketsLoading
                ? "Loading your tickets..."
                : filteredTickets.length > 0
                ? "Review conversations and respond when your role allows it."
                : "No tickets match your role yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketsLoading ? (
              <p className="text-sm text-muted-foreground">Loading tickets...</p>
            ) : sortedTickets.length === 0 ? (
              <div className="flex items-center space-x-3 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                <span>No tickets yet. Submit or wait for new activity.</span>
              </div>
            ) : (
              sortedTickets.map((ticket) => {
                const canReply = canRoleRespond(ticket, userRole)
                return (
                  <Card key={ticket.id} className="border-slate-200">
                    <CardHeader className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{ticket.title}</CardTitle>
                        <Badge variant="outline" className="capitalize">
                          {ticket.category}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={priorityVariant(ticket.priority)} className="capitalize">
                          {ticket.priority} priority
                        </Badge>
                        <Badge variant={statusVariant(ticket.status)} className="capitalize">
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.createdByName} ({ticket.createdByRole.replace("_", " ")})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Just now"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{ticket.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {ticket.responses.length ? (
                          ticket.responses.map((resp, idx) => (
                            <div key={`${ticket.id}-resp-${idx}`} className="rounded-lg border border-slate-100 p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {resp.userName || "Admin"}{" "}
                                  <span className="text-xs text-muted-foreground">
                                    ({resp.userRole?.replace("_", " ") || "admin"})
                                  </span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {resp.createdAt ? new Date(resp.createdAt).toLocaleString() : ""}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{resp.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No responses yet</p>
                        )}
                      </div>

                      {canReply ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Type your reply..."
                            value={responseDrafts[ticket.id] ?? ""}
                            onChange={(e) => handleResponseDraftChange(ticket.id, e.target.value)}
                            rows={3}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => handleResponseDraftChange(ticket.id, "")}
                              disabled={respondingTicketId === ticket.id}
                            >
                              Clear
                            </Button>
                            <Button
                              onClick={() => handleResponseSubmit(ticket)}
                              disabled={respondingTicketId === ticket.id}
                            >
                              {respondingTicketId === ticket.id ? "Sending..." : "Send Reply"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{readOnlyMessage(ticket, userRole)}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

