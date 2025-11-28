import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Star, AlertTriangle, CheckCircle } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  priority?: 'high' | 'medium' | 'low';
  clientName?: string;
  description?: string;
  category?: string;
  badge?: string;
  meta?: Record<string, any>;
}

interface CustomCalendarProps {
  events: CalendarEvent[];
  view?: 'month' | 'week' | 'day';
}

function getPriorityBadge(priority?: string) {
  if (priority === 'high')
    return <Badge className="bg-red-500 text-white flex items-center gap-1"><AlertTriangle className="w-3 h-3 mr-1" /> High</Badge>;
  if (priority === 'medium')
    return <Badge className="bg-yellow-500 text-white flex items-center gap-1"><Star className="w-3 h-3 mr-1" /> Medium</Badge>;
  return <Badge className="bg-green-500 text-white flex items-center gap-1"><CheckCircle className="w-3 h-3 mr-1" /> Low</Badge>;
}

function getPriorityColor(priority?: string) {
  if (priority === 'high') return 'bg-red-500';
  if (priority === 'medium') return 'bg-yellow-400';
  return 'bg-green-500';
}

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  let day = new Date(firstDay);
  // Fill leading empty days
  for (let i = 0; i < firstDay.getDay(); i++) week.push(null);
  while (day <= lastDay) {
    week.push(new Date(day));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
    day.setDate(day.getDate() + 1);
  }
  // Fill trailing empty days
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CustomCalendar({ events, view = 'month' }: CustomCalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);

  const monthMatrix = useMemo(() => getMonthMatrix(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const displayedMonthName = currentDate.toLocaleString('default', { month: 'long' });

  // Group events by date string (yyyy-mm-dd)
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  }

  // Get highest priority for a day
  function getDayPriority(events: CalendarEvent[]) {
    if (events.some(e => e.priority === 'high')) return 'high';
    if (events.some(e => e.priority === 'medium')) return 'medium';
    return 'low';
  }

  const getEventsForDate = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return eventsByDate[key] || [];
  };

  const handlePrev = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (view === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else if (view === 'week') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (view === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else if (view === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const startOfWeek = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return start;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    if (view !== 'week') return [];
    return Array.from({ length: 7 }, (_, idx) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + idx);
      return day;
    });
  }, [startOfWeek, view]);

  const currentDayEvents = view === 'day' ? getEventsForDate(currentDate) : [];

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(ev => isSameDay(new Date(ev.date), selectedDate));
  }, [selectedDate, events]);

  const headerLabel =
    view === 'day'
      ? currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : view === 'week'
        ? `Week of ${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : `${displayedMonthName} ${currentDate.getFullYear()}`;

  const renderEventPill = (ev: CalendarEvent) => (
    <div
      key={ev.id}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shadow-sm transition-colors ${getPriorityColor(ev.priority)} text-white hover:brightness-110 cursor-pointer`}
      title={ev.title}
      onClick={() => {
        setSelectedDate(new Date(ev.date));
        setShowModal(true);
      }}
      style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      {ev.badge ? `${ev.badge}: ` : ''}
      {ev.title}
    </div>
  );

  const renderEventCard = (ev: CalendarEvent) => (
    <div key={ev.id} className="p-3 border rounded-lg bg-white shadow-sm space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-gray-900">{ev.title}</span>
        {ev.badge && <Badge variant="secondary" className="text-xs">{ev.badge}</Badge>}
      </div>
      {ev.clientName && <p className="text-xs text-muted-foreground">Client: {ev.clientName}</p>}
      {ev.description && <p className="text-xs text-gray-600">{ev.description}</p>}
      <p className="text-[11px] text-gray-400">{new Date(ev.date).toLocaleString()}</p>
    </div>
  );

  const renderMonthView = () => (
    <>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthMatrix.flat().map((date, idx) => {
          if (!date) return <div key={idx} className="h-16 bg-transparent" />;
          const dayEvents = getEventsForDate(date);
          const isToday = isSameDay(date, today);
          const hasEvents = dayEvents.length > 0;
          const dayPriority = hasEvents ? getDayPriority(dayEvents) : undefined;
          return (
            <button
              key={idx}
              className={`relative h-16 w-full rounded-lg flex flex-col items-center justify-start p-1 border transition-all
                ${isToday ? 'border-[#6366F1] ring-2 ring-[#6366F1]/30' : 'border-gray-200'}
                ${hasEvents ? getPriorityColor(dayPriority) + ' bg-opacity-15' : 'bg-white'}
                hover:bg-gradient-to-br hover:from-[#6366F1]/10 hover:to-[#A855F7]/10 focus:outline-none`}
              onClick={() => { if (hasEvents) { setSelectedDate(date); setShowModal(true); } }}
              title={hasEvents ? `${dayEvents.length} event(s)` : ''}
            >
              <span className={`font-semibold text-base ${isToday ? 'bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent' : 'text-gray-800'}`}>{date.getDate()}</span>
              {hasEvents && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${getPriorityColor(dayPriority)}`}></span>
              )}
              <div className="w-full flex flex-col items-start mt-1 gap-1">
                {dayEvents.slice(0, 2).map(ev => renderEventPill(ev))}
                {dayEvents.length > 2 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-300 text-gray-700 mt-0.5">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  const renderWeekView = () => (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {weekDays.map(day => {
        const dayEvents = getEventsForDate(day);
        return (
          <div key={day.toISOString()} className="border rounded-xl p-3 bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="text-xs text-muted-foreground">{day.getDate()}</span>
            </div>
            {dayEvents.length ? dayEvents.map(ev => renderEventCard(ev)) : (
              <p className="text-xs text-muted-foreground">No events</p>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDayView = () => (
    <div className="space-y-3">
      {currentDayEvents.length ? currentDayEvents.map(ev => renderEventCard(ev)) : (
        <p className="text-sm text-muted-foreground">No events scheduled.</p>
      )}
    </div>
  );

  return (
    <div className="w-full bg-white p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 font-semibold text-lg">
          <CalendarIcon className="w-5 h-5 text-[#6366F1]" />
          {headerLabel}
        </div>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
      </div>
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
      {/* Modal for events on selected date */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <CalendarIcon className="w-5 h-5 text-[#6366F1]" />
              Events on {selectedDate?.toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          {selectedEvents.length > 0 ? (
            <ul className="space-y-4">
              {selectedEvents.map(ev => (
                <li key={ev.id} className="p-3 border rounded-lg shadow-sm bg-white hover:bg-gradient-to-br hover:from-[#6366F1]/10 hover:to-[#A855F7]/10 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-base text-gray-900">{ev.title}</span>
                    {ev.badge ? (
                      <Badge variant="secondary" className="text-xs">{ev.badge}</Badge>
                    ) : (
                      getPriorityBadge(ev.priority)
                    )}
                  </div>
                  {ev.clientName && <div className="text-xs text-muted-foreground">Client: {ev.clientName}</div>}
                  {ev.description && <div className="text-xs text-gray-700 mt-1">{ev.description}</div>}
                  <div className="text-xs text-gray-500 mt-1">{new Date(ev.date).toLocaleString()}</div>
                  {ev.meta?.status && (
                    <div className="text-[11px] text-gray-400">Status: {ev.meta.status}</div>
                  )}
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