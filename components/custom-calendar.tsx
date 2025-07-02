import React, { useState } from 'react';
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
}

interface CustomCalendarProps {
  events: CalendarEvent[];
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

export function CustomCalendar({ events }: CustomCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);

  const monthMatrix = getMonthMatrix(currentYear, currentMonth);
  const monthName = today.toLocaleString('default', { month: 'long' });
  const displayedMonthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

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

  // Events for selected date
  const selectedEvents = selectedDate
    ? events.filter(ev => isSameDay(new Date(ev.date), selectedDate))
    : [];

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => {
          if (currentMonth === 0) {
            setCurrentMonth(11); setCurrentYear(currentYear - 1);
          } else setCurrentMonth(currentMonth - 1);
        }}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 font-semibold text-lg">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          {displayedMonthName} {currentYear}
        </div>
        <Button variant="ghost" size="icon" onClick={() => {
          if (currentMonth === 11) {
            setCurrentMonth(0); setCurrentYear(currentYear + 1);
          } else setCurrentMonth(currentMonth + 1);
        }}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }}>Today</Button>
      </div>
      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthMatrix.flat().map((date, idx) => {
          if (!date) return <div key={idx} className="h-16 bg-transparent" />;
          const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          const dayEvents = eventsByDate[key] || [];
          const isToday = isSameDay(date, today);
          const hasEvents = dayEvents.length > 0;
          const dayPriority = hasEvents ? getDayPriority(dayEvents) : undefined;
          return (
            <button
              key={idx}
              className={`relative h-16 w-full rounded-lg flex flex-col items-center justify-start p-1 border transition-all
                ${isToday ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}
                ${hasEvents ? getPriorityColor(dayPriority) + ' bg-opacity-20' : 'bg-white'}
                hover:bg-blue-50 focus:outline-none`}
              onClick={() => { if (hasEvents) { setSelectedDate(date); setShowModal(true); } }}
              title={hasEvents ? `${dayEvents.length} event(s)` : ''}
            >
              <span className={`font-semibold text-base ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{date.getDate()}</span>
              {/* Dot or badge for events */}
              {hasEvents && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${getPriorityColor(dayPriority)}`}></span>
              )}
              {/* Show up to 2 tasks/events with priority color */}
              <div className="w-full flex flex-col items-start mt-1 gap-1">
                {dayEvents.slice(0, 2).map(ev => (
                  <span
                    key={ev.id}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shadow-sm cursor-pointer transition-colors
                      ${getPriorityColor(ev.priority)} text-white hover:brightness-110`}
                    title={ev.title}
                    style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {ev.title}
                  </span>
                ))}
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
      {/* Modal for events on selected date */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Events on {selectedDate?.toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          {selectedEvents.length > 0 ? (
            <ul className="space-y-4">
              {selectedEvents.map(ev => (
                <li key={ev.id} className="p-3 border rounded-lg shadow-sm bg-white hover:bg-blue-50 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-base text-gray-900">{ev.title}</span>
                    {getPriorityBadge(ev.priority)}
                  </div>
                  {ev.clientName && <div className="text-xs text-muted-foreground">Client: {ev.clientName}</div>}
                  {ev.description && <div className="text-xs text-gray-700 mt-1">{ev.description}</div>}
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