import React, { useState, useRef, useEffect } from 'react';
import { ViewMode } from './types';
import { addDays, startOfWeek } from './dateUtils';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentDate: Date;
  view: ViewMode;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onViewChange: (view: ViewMode) => void;
  onToggleSidebar: () => void;
  onToggleAccountMenu: () => void;
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
  onToggleAccountMenu,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleAccountMenu = () => {
    setIsOpen(!isOpen);
    onToggleAccountMenu();
  };

  const handleThemeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTheme();
  };

  return (
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
      {/* Account Settings Dropdown */}
      <div className="account-menu-wrapper" ref={accountMenuRef}>
        <button
          className="icon-btn account-menu-btn"
          onClick={toggleAccountMenu}
          aria-label="Account settings"
        >
          @
        </button>
        {isOpen && (
          <div className="account-menu-dropdown">
            <div className="account-menu-header">
              <span className="account-name">User Account</span>
              <span className="account-email">user@example.com</span>
            </div>
            <div className="account-menu-separator"></div>
            <div className="account-menu-item theme-switch-container" onClick={handleThemeToggle}>
              <span className="menu-item-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span className="menu-item-text">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <div className={`theme-switch ${theme === 'dark' ? 'active' : ''}`}>
                <div className="theme-switch-thumb"></div>
              </div>
            </div>
            <div className="account-menu-separator"></div>
            <button className="account-menu-item">
              <span className="menu-item-icon">👤</span>
              <span className="menu-item-text">Profile</span>
            </button>
            <button className="account-menu-item">
              <span className="menu-item-icon">⚙️</span>
              <span className="menu-item-text">Settings</span>
            </button>
            <div className="account-menu-separator"></div>
            <button className="account-menu-item">
              <span className="menu-item-icon">_logout_</span>
              <span className="menu-item-text">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
