import React, { useEffect, useState } from 'react';
import { addMonths, isSameDay, monthGrid, WEEKDAYS_SHORT } from './dateUtils';

interface SidebarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onCreate: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedDate, onSelectDate, onCreate }) => {
  // The mini calendar can browse months independently of the main view.
  const [shownMonth, setShownMonth] = useState<Date>(selectedDate);
  useEffect(() => setShownMonth(selectedDate), [selectedDate]);

  const today = new Date();

  return (
    <aside className="sidebar">
      <button className="create-btn" onClick={onCreate}>
        <span className="create-plus">+</span> Create
      </button>

      <div className="mini-cal">
        <div className="mini-cal-header">
          <span>{shownMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
          <div>
            <button className="icon-btn small" onClick={() => setShownMonth(addMonths(shownMonth, -1))}>
              ‹
            </button>
            <button className="icon-btn small" onClick={() => setShownMonth(addMonths(shownMonth, 1))}>
              ›
            </button>
          </div>
        </div>
        <div className="mini-cal-grid">
          {WEEKDAYS_SHORT.map((d) => (
            <span key={d} className="mini-cal-weekday">
              {d[0]}
            </span>
          ))}
          {monthGrid(shownMonth).map((day) => {
            const classes = ['mini-cal-day'];
            if (day.getMonth() !== shownMonth.getMonth()) classes.push('muted');
            if (isSameDay(day, today)) classes.push('today');
            else if (isSameDay(day, selectedDate)) classes.push('selected');
            return (
              <button key={day.toISOString()} className={classes.join(' ')} onClick={() => onSelectDate(day)}>
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
