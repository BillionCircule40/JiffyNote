import React from 'react';
import { ViewMode } from './types';
import { addDays, startOfWeek } from './dateUtils';

interface HeaderProps {
  currentDate: Date;
  view: ViewMode;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onViewChange: (view: ViewMode) => void;
  onToggleSidebar: () => void;
}

function headerTitle(date: Date, view: ViewMode): string {
  if (view === 'day') {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (view === 'week') {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return start.toLocaleDateString([], { month: 'long', year: 'numeric' });
    }
    const s = start.toLocaleDateString([], { month: 'short' });
    const e = end.toLocaleDateString([], { month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

const Header: React.FC<HeaderProps> = ({
  currentDate,
  view,
  onToday,
  onPrev,
  onNext,
  onViewChange,
  onToggleSidebar,
}) => (
  <header className="header">
    <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
      ☰
    </button>
    <div className="logo">
      <span className="logo-mark">{new Date().getDate()}</span>
      <span className="logo-text">JiffyNote</span>
    </div>
    <button className="outline-btn" onClick={onToday}>
      Today
    </button>
    <button className="icon-btn" onClick={onPrev} aria-label="Previous">
      ‹
    </button>
    <button className="icon-btn" onClick={onNext} aria-label="Next">
      ›
    </button>
    <h1 className="header-title">{headerTitle(currentDate, view)}</h1>
    <select
      className="view-select"
      value={view}
      onChange={(e) => onViewChange(e.target.value as ViewMode)}
    >
      <option value="day">Day</option>
      <option value="week">Week</option>
      <option value="month">Month</option>
    </select>
  </header>
);

export default Header;
