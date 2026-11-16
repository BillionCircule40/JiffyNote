import React, { useEffect, useRef, useState } from 'react';
import { CalendarEvent } from './types';
import { formatHour, formatTime, isSameDay, WEEKDAYS_SHORT } from './dateUtils';

const HOUR_HEIGHT = 48; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface TimeGridViewProps {
  days: Date[]; // 1 day for Day view, 7 for Week view
  events: CalendarEvent[];
  onSlotClick: (start: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDragStart?: (eventId: string) => void;
  onEventDrop?: (e: React.DragEvent, targetDate: Date, targetHour: number) => void;
  onEventHorizontalDrop?: (e: React.DragEvent, targetDate: Date) => void;
}

const TimeGridView: React.FC<TimeGridViewProps> = ({ days, events, onSlotClick, onEventClick, onEventDragStart, onEventDrop, onEventHorizontalDrop }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // Start scrolled to ~8 AM like Google Calendar
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_HEIGHT * 8;
  }, []);

  // Keep the red "now" line moving
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleColumnClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = ((e.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const snapped = Math.floor(minutes / 30) * 30; // snap to 30 min
    const start = new Date(day);
    start.setHours(0, snapped, 0, 0);
    onSlotClick(start);
  };

  return (
    <div className="time-grid">
      <div className="time-grid-header">
        <div className="gutter" />
        {days.map((day) => {
          const isToday = isSameDay(day, now);
          return (
            <div key={day.toISOString()} className={`day-header${isToday ? ' today' : ''}`}>
              <span className="day-header-name">{WEEKDAYS_SHORT[day.getDay()]?.toUpperCase()}</span>
              <span className="day-header-num">{day.getDate()}</span>
            </div>
          );
        })}
      </div>

      <div className="time-grid-body" ref={scrollRef}>
        <div className="gutter">
          {HOURS.map((h) => (
            <div key={h} className="hour-label" style={{ height: HOUR_HEIGHT }}>
              <span>{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayEvents = events.filter((ev) => isSameDay(new Date(ev.start), day));
          return (
            <div
              key={day.toISOString()}
              className="day-column"
              style={{ height: HOUR_HEIGHT * 24 }}
              onClick={(e) => handleColumnClick(day, e)}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (onEventHorizontalDrop) {
                  onEventHorizontalDrop(e, day);
                }
              }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="hour-cell"
                  style={{ height: HOUR_HEIGHT }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEventDrop?.(e, day, h);
                  }}
                />
              ))}

              {dayEvents.map((ev) => {
                const start = new Date(ev.start);
                const end = new Date(ev.end);
                const startMin = start.getHours() * 60 + start.getMinutes();
                const duration = Math.max((end.getTime() - start.getTime()) / 60000, 15);
                return (
                  <div
                    key={ev.id}
                    className="event-block"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      if (onEventDragStart) {
                        onEventDragStart(ev.id);
                      }
                    }}
                    style={{
                      top: (startMin / 60) * HOUR_HEIGHT,
                      height: (duration / 60) * HOUR_HEIGHT - 2,
                      background: ev.color,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                  >
                    <div className="event-title">{ev.title}</div>
                    <div className="event-time">
                      {formatTime(start)} – {formatTime(end)}
                    </div>
                  </div>
                );
              })}

              {isSameDay(day, now) && (
                <div
                  className="now-line"
                  style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeGridView;
