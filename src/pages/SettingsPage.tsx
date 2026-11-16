import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import authService, { User } from '../services/authService';
import {
  ANTHROPIC_MODEL,
  GOOGLE_MODEL,
  tokensBurnedThisMonth,
  verifyApiKey,
  type BurnRecord,
  type ProofSettings,
} from '../services/proofService';

interface SettingsPageProps {
  currentUser: User | null;
  onClose: () => void;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
  proofSettings: ProofSettings;
  burns: BurnRecord[];
  onProofSettingsChange: (settings: ProofSettings) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  test: 'Test key (no network calls)',
  anthropic: `Anthropic · ${ANTHROPIC_MODEL}`,
  google: `Google · ${GOOGLE_MODEL}`,
};

function maskKey(key: string): string {
  return key.length <= 8 ? key : `${key.slice(0, 6)}…${key.slice(-4)}`;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onClose,
  onLogout,
  onUserUpdated,
  proofSettings,
  burns,
  onProofSettingsChange,
}) => {
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
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [verifyingKey, setVerifyingKey] = useState(false);

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

  const verifyAndSaveKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setVerifyingKey(true);
    const result = await verifyApiKey(apiKeyInput);
    setVerifyingKey(false);

    if (!result.ok || !result.provider) {
      setError(result.error ?? 'Could not verify that key.');
      return;
    }

    onProofSettingsChange({
      ...proofSettings,
      apiKey: apiKeyInput.trim(),
      provider: result.provider,
      verifiedAt: new Date().toISOString(),
    });
    setApiKeyInput('');
    setNotice(result.provider === 'test' ? 'Test key saved. Proof checks and burns are simulated.' : 'API key verified and saved.');
  };

  const removeKey = () => {
    onProofSettingsChange({ ...proofSettings, apiKey: null, provider: null, verifiedAt: null, realBurnEnabled: false });
    setNotice('API key removed.');
  };

  const updateNumber = (field: 'graceHours' | 'burnTokensPerMiss' | 'monthlyBurnCap', value: string) => {
    const parsed = Math.max(0, Math.floor(Number(value) || 0));
    onProofSettingsChange({ ...proofSettings, [field]: parsed });
  };

  const isRealKey = Boolean(proofSettings.verifiedAt && proofSettings.provider && proofSettings.provider !== 'test');
  const burnedThisMonth = tokensBurnedThisMonth(burns);
  const recentBurns = [...burns].reverse().slice(0, 5);

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

        <div className="settings-section settings-form">
          <h3>Proof checking</h3>
          {proofSettings.verifiedAt && proofSettings.apiKey && proofSettings.provider ? (
            <div className="settings-row">
              <span>
                {PROVIDER_LABELS[proofSettings.provider]}
                <br />
                <small>{maskKey(proofSettings.apiKey)} · verified {new Date(proofSettings.verifiedAt).toLocaleDateString()}</small>
              </span>
              <button type="button" className="text-btn danger" onClick={removeKey}>Remove</button>
            </div>
          ) : (
            <form onSubmit={verifyAndSaveKey}>
              <label>
                <span>AI API key (Anthropic or Google). Enter "test" to try it without a key.</span>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder="sk-ant-…, AIza…, or test"
                  autoComplete="off"
                  required
                />
              </label>
              <button type="submit" className="settings-save-btn" disabled={verifyingKey || !apiKeyInput.trim()}>
                {verifyingKey ? 'Verifying...' : 'Verify and save'}
              </button>
            </form>
          )}

          <label>
            <span>Hours after an event ends to submit proof</span>
            <input type="number" min={0} value={proofSettings.graceHours} onChange={(event) => updateNumber('graceHours', event.target.value)} />
          </label>
          <label>
            <span>Tokens burned per missed proof</span>
            <input type="number" min={0} step={1000} value={proofSettings.burnTokensPerMiss} onChange={(event) => updateNumber('burnTokensPerMiss', event.target.value)} />
          </label>
          <label>
            <span>Monthly burn cap (tokens)</span>
            <input type="number" min={0} step={1000} value={proofSettings.monthlyBurnCap} onChange={(event) => updateNumber('monthlyBurnCap', event.target.value)} />
          </label>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={proofSettings.realBurnEnabled}
              disabled={!isRealKey}
              onChange={(event) => onProofSettingsChange({ ...proofSettings, realBurnEnabled: event.target.checked })}
            />
            <span>Really burn tokens on my key (charges my provider account). Off means burns are only logged.</span>
          </label>

          <div className="settings-row">
            <span>Burned this month</span>
            <strong>{burnedThisMonth.toLocaleString()} / {proofSettings.monthlyBurnCap.toLocaleString()}</strong>
          </div>
          {recentBurns.length > 0 && (
            <ul className="burn-log">
              {recentBurns.map((burn) => (
                <li key={burn.id}>
                  <strong>{burn.eventTitle}</strong> · {new Date(burn.at).toLocaleString()} · {burn.note}
                </li>
              ))}
            </ul>
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
            <button type="button" className="settings-logout-btn" onClick={onLogout}>Log out</button>
          )}
        </div>
        {(error || notice) && <p className={error ? 'settings-feedback error' : 'settings-feedback'} role="status">{error || notice}</p>}
      </div>
    </div>
  );
};

export default SettingsPage;
