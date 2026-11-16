import React from 'react';
import { CalendarEvent } from './types';
import { isSameDay, monthGrid, WEEKDAYS_SHORT } from './dateUtils';

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onMonthClick: (month: Date) => void;
  onDayClick: (day: Date) => void;
}

const YearView: React.FC<YearViewProps> = ({ currentDate, events, onMonthClick, onDayClick }) => (
  <div className="year-view">
    {Array.from({ length: 12 }, (_, monthIndex) => {
      const month = new Date(currentDate.getFullYear(), monthIndex, 1);
      const days = monthGrid(month);

      return (
        <section className="year-month" key={monthIndex}>
          <button className="year-month-title" type="button" onClick={() => onMonthClick(month)}>
            {month.toLocaleDateString([], { month: 'long' })}
          </button>
          <div className="year-month-grid">
            {WEEKDAYS_SHORT.map((weekday) => (
              <span className="year-weekday" key={weekday}>{weekday[0]}</span>
            ))}
            {days.map((day) => {
              const hasEvents = events.some((event) => isSameDay(new Date(event.start), day));
              const inMonth = day.getMonth() === monthIndex;
              const selected = isSameDay(day, currentDate);
              return (
                <button
                  className={`year-day${inMonth ? '' : ' outside'}${selected ? ' selected' : ''}${hasEvents ? ' has-events' : ''}`}
                  key={day.toISOString()}
                  type="button"
                  aria-label={day.toLocaleDateString([], { dateStyle: 'full' })}
                  onClick={() => onDayClick(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </section>
      );
    })}
  </div>
);

export default YearView;