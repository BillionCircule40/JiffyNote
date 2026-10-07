import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
      {showLabel && <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
    </button>
  );
};

export default ThemeToggle;
