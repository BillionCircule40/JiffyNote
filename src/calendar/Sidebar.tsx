import React, { useEffect, useState } from 'react';
import { addMonths, isSameDay, monthGrid, WEEKDAYS_SHORT } from './dateUtils';

interface SidebarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onCreateEvent: () => void;
  onCreateNote: () => void;
  onTabChange: (tab: 'calendar' | 'notes') => void;
  activeTab: 'calendar' | 'notes';
}

const Sidebar: React.FC<SidebarProps> = ({ selectedDate, onSelectDate, onCreateEvent, onCreateNote, onTabChange, activeTab }) => {
  // The mini calendar can browse months independently of the main view.
  const [shownMonth, setShownMonth] = useState<Date>(selectedDate);
  useEffect(() => setShownMonth(selectedDate), [selectedDate]);

  const today = new Date();

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => onTabChange('calendar')}
        >
          Calendar
        </button>
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => onTabChange('notes')}
        >
          Notes
        </button>
      </div>

      <button className="create-btn" onClick={activeTab === 'notes' ? onCreateNote : onCreateEvent}>
        <span className="create-plus">+</span> Create
      </button>

      {activeTab === 'calendar' && (
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
              return (
                <button key={day.toISOString()} className={classes.join(' ')} onClick={() => onSelectDate(day)}>
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
