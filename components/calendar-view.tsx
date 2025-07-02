"use client"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Very lightweight calendar/list view.
 * – `view = "month" | "week" | "day"` just changes heading + grouping.
 * – Click handlers are forwarded so consumers can attach dialogs, etc.
 *   (See app/calendar/page.tsx.)
 */

export interface CalendarEvent {
  id: string
  title: string
  date: string // ISO date or yyyy-mm-dd
  priority?: "high" | "medium" | "low"
  clientName?: string
  description?: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
  view?: "month" | "week" | "day"
  className?: string
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (dateIso: string) => void
}

export function CalendarView({ events, view = "month", className, onEventClick, onDateClick }: CalendarViewProps) {
  // Group events by date so we can show a simple agenda.
  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const key = ev.date.slice(0, 10)
    acc[key] = acc[key] ? [...acc[key], ev] : [ev]
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  const priorityColor = (p?: string) =>
    p === "high" ? "bg-red-500" : p === "medium" ? "bg-yellow-500" : "bg-green-500"

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <h2 className="text-xl font-semibold capitalize">{view} view</h2>

      {/* Dates */}
      {sortedDates.length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}

      {sortedDates.map((date) => (
        <Card key={date} className="p-4 cursor-pointer" onClick={() => onDateClick?.(date)}>
          <h3 className="text-lg font-medium mb-2">{date}</h3>
          <ul className="space-y-2">
            {grouped[date].map((ev) => (
              <li
                key={ev.id}
                className="flex items-start gap-3 hover:bg-accent/30 p-2 rounded-md transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onEventClick?.(ev)
                }}
              >
                <span className={cn("inline-block w-2 h-2 rounded-full mt-2", priorityColor(ev.priority))} />
                <div className="flex-1">
                  <p className="font-medium">{ev.title}</p>
                  {ev.clientName && <p className="text-xs text-muted-foreground">{ev.clientName}</p>}
                  {ev.description && <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>}
                </div>
                {ev.priority && (
                  <Badge variant="outline" className="capitalize">
                    {ev.priority}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
