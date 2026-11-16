import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import authService, { User } from '../services/authService';

interface SettingsPageProps {
  currentUser: User | null;
  onClose: () => void;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onClose, onLogout, onUserUpdated }) => {
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setUsername(currentUser?.username ?? '');
    setEmail(currentUser?.email ?? '');
  }, [currentUser?.id, currentUser?.username, currentUser?.email]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    setError('');
    setNotice('');
    setSavingProfile(true);

    const result = await authService.updateUserProfile(currentUser.id, { username, email }, profileCurrentPassword);
    setSavingProfile(false);

    if (!result.success || !result.user) {
      setError(result.error ?? 'Could not update your profile.');
      return;
    }

    onUserUpdated(result.user);
    setProfileCurrentPassword('');
    setNotice('Profile updated.');
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    setError('');
    setNotice('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSavingPassword(true);
    const result = await authService.updateUserProfile(
      currentUser.id,
      { password: newPassword },
      passwordCurrentPassword,
    );
    setSavingPassword(false);

    if (!result.success || !result.user) {
      setError(result.error ?? 'Could not update your password.');
      return;
    }

    onUserUpdated(result.user);
    setPasswordCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNotice('Password updated.');
  };

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

        {currentUser && (
          <>
            <form className="settings-section settings-form" onSubmit={saveProfile}>
              <h3>Profile</h3>
              <label>
                <span>Username</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <label>
                <span>Current password</span>
                <input type="password" value={profileCurrentPassword} onChange={(event) => setProfileCurrentPassword(event.target.value)} autoComplete="current-password" required />
              </label>
              <button type="submit" className="settings-save-btn" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save profile'}
              </button>
            </form>

            <form className="settings-section settings-form" onSubmit={savePassword}>
              <h3>Change password</h3>
              <label>
                <span>Current password</span>
                <input type="password" value={passwordCurrentPassword} onChange={(event) => setPasswordCurrentPassword(event.target.value)} autoComplete="current-password" required />
              </label>
              <label>
                <span>New password</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
              </label>
              <label>
                <span>Confirm new password</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
              </label>
              <button type="submit" className="settings-save-btn" disabled={savingPassword}>
                {savingPassword ? 'Saving...' : 'Update password'}
              </button>
            </form>
          </>
        )}

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
            <button type="button" className="settings-logout-btn" onClick={onLogout}>Log out</button>
          )}
        </div>
        {(error || notice) && <p className={error ? 'settings-feedback error' : 'settings-feedback'} role="status">{error || notice}</p>}
      </div>
    </div>
  );
};

export default SettingsPage;
