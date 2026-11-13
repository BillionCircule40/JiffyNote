import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { User } from '../services/authService';

interface SettingsPageProps {
  currentUser: User | null;
  onClose: () => void;
  onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onClose, onLogout }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <p className="settings-kicker">Account</p>
            <h2>Settings</h2>
          </div>
          <button type="button" className="icon-btn small" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <div className="settings-section">
          <h3>Profile</h3>
          <div className="settings-row">
            <span>Signed in as</span>
            <strong>{currentUser ? currentUser.username : 'Guest'}</strong>
          </div>
          {currentUser && (
            <div className="settings-row muted-row">
              <span>Email</span>
              <strong>{currentUser.email}</strong>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-row compact-row">
            <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            <button type="button" className="theme-toggle-btn compact-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Data</h3>
          <div className="settings-row">
            <span>Local sync</span>
            <strong>Enabled</strong>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="text-btn" onClick={onClose}>Close</button>
          {currentUser && (
            <button type="button" className="primary-btn" onClick={onLogout}>Log out</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
