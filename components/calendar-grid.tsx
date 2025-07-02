import { Calendar, momentLocalizer } from 'react-big-calendar';
import { useMemo, useState } from 'react';
import { parseISO, isSameDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Star, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { useRef } from 'react';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  priority?: 'high' | 'medium' | 'low';
  clientName?: string;
  description?: string;
}

interface CalendarGridProps {
  events: CalendarEvent[];
  view?: 'month' | 'week' | 'day';
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

const localizer = momentLocalizer(require('moment'));

function getPriorityBadge(priority?: string) {
  if (priority === 'high')
    return <Badge className="bg-red-500 text-white flex items-center gap-1"><AlertTriangle className="w-3 h-3 mr-1" /> High</Badge>;
  if (priority === 'medium')
    return <Badge className="bg-yellow-500 text-white flex items-center gap-1"><Star className="w-3 h-3 mr-1" /> Medium</Badge>;
  return <Badge className="bg-green-500 text-white flex items-center gap-1"><CheckCircle className="w-3 h-3 mr-1" /> Low</Badge>;
}

export function CalendarGrid({ events, view = 'month', onEventClick, onDateClick }: CalendarGridProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<any | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Map your events to react-big-calendar format
  const rbcEvents = useMemo(() =>
    events.map(ev => ({
      id: ev.id,
      title: ev.title,
      start: parseISO(ev.date),
      end: parseISO(ev.date),
      allDay: true,
      resource: ev,
    })),
    [events]
  );

  // Highlight dates with events
  const eventPropGetter = (event: any) => {
    let bg = '#22c55e';
    if (event.resource.priority === 'high') bg = '#ef4444';
    else if (event.resource.priority === 'medium') bg = '#facc15';
    return {
      style: {
        backgroundColor: bg,
        color: '#fff',
        borderRadius: 12,
        border: 'none',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: 14,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      },
      onMouseEnter: (e: any) => {
        const rect = e.target.getBoundingClientRect();
        setPopoverEvent(event.resource);
        setPopoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
      },
      onMouseLeave: () => {
        setPopoverEvent(null);
        setPopoverPosition(null);
      },
    };
  };

  // When a date cell is clicked
  const handleSelectSlot = (slotInfo: any) => {
    const date = slotInfo.start;
    // Check if there are events on this date
    const eventsOnDate = rbcEvents.filter(ev => isSameDay(ev.start, date));
    if (eventsOnDate.length > 0) {
      setSelectedDate(date);
      setShowModal(true);
    }
    onDateClick?.(date);
  };

  // Events for the selected date
  const eventsForSelectedDate = selectedDate
    ? rbcEvents.filter(ev => isSameDay(ev.start, selectedDate))
    : [];

  // Custom day cell wrapper for month view to add "+" button and hover effect
  function CustomDateCellWrapper({ children, value }: any) {
    const isToday = isSameDay(value, new Date());
    return (
      <div className={`relative group h-full w-full bg-white ${isToday ? 'ring-2 ring-blue-400' : ''} transition-all`}
        style={{ minHeight: 80 }}>
        <button
          className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 text-white rounded-full p-1 shadow hover:bg-blue-600"
          title="Quick add event"
          style={{ fontSize: 12 }}
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); alert('Quick add event (placeholder)'); }}
        >
          <Plus className="w-3 h-3" />
        </button>
        {children}
      </div>
    );
  }

  return (
    <div ref={calendarRef} style={{ height: 600, fontFamily: 'Inter, Arial, sans-serif' }} className="bg-gray-50 rounded-lg shadow-md p-2 sm:p-4">
      {/* Google Calendar Connect Button Placeholder */}
      <div className="flex justify-end mb-2">
        <Button variant="outline" className="flex items-center gap-2" disabled>
          <CalendarIcon className="w-4 h-4" /> Connect Google Calendar
        </Button>
      </div>
      <Calendar
        localizer={localizer}
        events={rbcEvents}
        defaultView={view}
        views={['month', 'week', 'day']}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={event => onEventClick?.(event.resource)}
        onSelectSlot={handleSelectSlot}
        selectable
        popup
        eventPropGetter={eventPropGetter}
        components={{
          month: {
            dateCellWrapper: CustomDateCellWrapper,
          },
        }}
      />
      {/* Event popover on hover */}
      {popoverEvent && popoverPosition && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border p-3 min-w-[220px] max-w-xs text-sm animate-fade-in"
          style={{ left: popoverPosition.x, top: popoverPosition.y - 10, pointerEvents: 'none' }}
        >
          <div className="font-semibold text-base mb-1 flex items-center gap-2">
            {popoverEvent.title} {getPriorityBadge(popoverEvent.priority)}
          </div>
          {popoverEvent.clientName && <div className="text-xs text-muted-foreground">Client: {popoverEvent.clientName}</div>}
          {popoverEvent.description && <div className="text-xs text-gray-700 mt-1">{popoverEvent.description}</div>}
        </div>
      )}
      {/* Modal for events on selected date */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Events on {selectedDate?.toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          {eventsForSelectedDate.length > 0 ? (
            <ul className="space-y-4">
              {eventsForSelectedDate.map(ev => (
                <li key={ev.id} className="p-3 border rounded-lg shadow-sm bg-white hover:bg-blue-50 cursor-pointer" onClick={() => onEventClick?.(ev.resource)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-base text-gray-900">{ev.title}</span>
                    {getPriorityBadge(ev.resource.priority)}
                  </div>
                  {ev.resource.clientName && <div className="text-xs text-muted-foreground">Client: {ev.resource.clientName}</div>}
                  {ev.resource.description && <div className="text-xs text-gray-700 mt-1">{ev.resource.description}</div>}
                  <div className="text-xs text-gray-500 mt-1">Task ID: {ev.id}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div>No events for this date.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 