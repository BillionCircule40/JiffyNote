import React, { useState, useRef, useEffect } from 'react';
import { ViewMode } from './types';
import { addDays, startOfWeek } from './dateUtils';
import { useTheme } from '../context/ThemeContext';
import { User } from '../services/authService';
import PriorityFilter from '../components/PriorityFilter';

interface HeaderProps {
  currentDate: Date;
  view: ViewMode;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onViewChange: (view: ViewMode) => void;
  onToggleSidebar: () => void;
  onToggleAccountMenu: () => void;
  priorityRange?: number[];
  onPriorityRangeChange?: (selectedPriorities: number[]) => void;
  currentUser?: User | null;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

function headerTitle(date: Date, view: ViewMode): string {
  if (view === 'year') {
    return date.getFullYear().toString();
  }
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
  priorityRange = [1, 2, 3, 4, 5, 6, 7, 8, 9],
  onPriorityRangeChange,
  currentUser,
  onOpenSettings,
  onOpenAuth,
  onLogout,
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
      <div className="header-start">
        <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          ☰
        </button>
        <img
          className="logo-image"
          src={theme === 'dark' ? '/jiffynote-logo-dark.svg' : '/jiffynote-logo.svg'}
          alt="JiffyNote"
        />
        <div className="header-controls-group">
          {onPriorityRangeChange && (
            <PriorityFilter
              selectedPriorities={priorityRange}
              onChange={onPriorityRangeChange}
            />
          )}
          <button className="outline-btn" onClick={onToday}>
            Today
          </button>
        </div>
        <button className="icon-btn" onClick={onPrev} aria-label="Previous">
          ‹
        </button>
        <button className="icon-btn" onClick={onNext} aria-label="Next">
          ›
        </button>
        <h1 className="header-title">{headerTitle(currentDate, view)}</h1>
      </div>
      <div className="view-slider" role="group" aria-label="Calendar view">
        <input
          className="view-range"
          type="range"
          min={0}
          max={3}
          step={1}
          value={(['day', 'week', 'month', 'year'] as ViewMode[]).indexOf(view)}
          aria-label="Calendar view"
          aria-valuetext={`${view[0]?.toUpperCase()}${view.slice(1)} view`}
          onChange={(e) => {
            const views: ViewMode[] = ['day', 'week', 'month', 'year'];
            onViewChange(views[Number(e.target.value)] ?? 'week');
          }}
        />
        <div className="view-range-labels" aria-hidden="true">
          {(['day', 'week', 'month', 'year'] as ViewMode[]).map((viewOption) => (
            <span className={view === viewOption ? 'active' : ''} key={viewOption}>
              {viewOption[0]?.toUpperCase()}{viewOption.slice(1)}
            </span>
          ))}
        </div>
      </div>
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
              <span className="account-name">{currentUser ? currentUser.username : 'Guest user'}</span>
              <span className="account-email">{currentUser ? currentUser.email : 'Not signed in'}</span>
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
            <button
              className="account-menu-item"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
            >
              <span className="menu-item-icon">⚙️</span>
              <span className="menu-item-text">Settings</span>
            </button>
            {currentUser ? (
              <button
                className="account-menu-item"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
              >
                <span className="menu-item-icon logout-menu-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                    <path d="M12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" />
                  </svg>
                </span>
                <span className="menu-item-text">Log out</span>
              </button>
            ) : (
              <button
                className="account-menu-item"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAuth();
                }}
              >
                <span className="menu-item-icon">🔐</span>
                <span className="menu-item-text">Sign in / create account</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
