import React from 'react';
import { CalendarEvent } from './types';
import { formatTime, isSameDay, monthGrid, WEEKDAYS_SHORT } from './dateUtils';

const MAX_CHIPS = 3;

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, events, onDayClick, onEventClick }) => {
  const today = new Date();

  const handleDayClick = (day: Date) => {
    onDayClick(day);
  };

  return (
    <div className="month-view">
      <div className="month-weekdays">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d}>{d.toUpperCase()}</div>
        ))}
      </div>
      <div className="month-grid">
        {monthGrid(currentDate).map((day) => {
          const dayEvents = events
            .filter((ev) => isSameDay(new Date(ev.start), day))
            .sort((a, b) => a.start.localeCompare(b.start));
          const outside = day.getMonth() !== currentDate.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={`month-cell${outside ? ' muted' : ''}${isSameDay(day, currentDate) ? ' selected' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <span className={`month-day-num${isSameDay(day, today) ? ' today' : ''}${isSameDay(day, currentDate) ? ' selected' : ''}`}>
                {day.getDate() === 1
                  ? day.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : day.getDate()}
              </span>
              {dayEvents.slice(0, MAX_CHIPS).map((ev) => (
                <button
                  key={ev.id}
                  className="event-chip"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                >
                  <span className="chip-dot" style={{ background: ev.color }} />
                  <span className="chip-time">{formatTime(new Date(ev.start))}</span>
                  <span className="chip-title">{ev.title}</span>
                </button>
              ))}
              {dayEvents.length > MAX_CHIPS && (
                <span className="more-chip">{dayEvents.length - MAX_CHIPS} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
