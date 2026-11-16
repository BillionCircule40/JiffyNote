import React, { useMemo, useState } from 'react';
import authService, { User } from '../services/authService';

interface AuthPageProps {
  onAuthenticated: (user: User) => Promise<void>;
  onContinueAsGuest: () => void;
  isGuest: boolean;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated, onContinueAsGuest, isGuest }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = useMemo(() => (mode === 'login' ? 'Log in' : 'Create account'), [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    if (mode === 'signup' && !email.trim()) {
      setError('Email is required to create an account.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = mode === 'login'
        ? await authService.login({ username: username.trim(), password })
        : await authService.register({
            username: username.trim(),
            email: email.trim(),
            password,
          });

      if (!result.success || !result.user) {
        setError(result.error ?? 'Unable to authenticate right now.');
        return;
      }

      await onAuthenticated(result.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-kicker">Welcome back</p>
          <h1>{mode === 'login' ? 'Sign in to JiffyNote' : 'Create your account'}</h1>
        </div>

        <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'login' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="yourname"
              autoComplete="username"
            />
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
          )}

          <label className="field">
            <span>Password</span>
            <span className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="password-visibility-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.1 9.5 6.2a1.8 1.8 0 010 1.6 12.5 12.5 0 01-3.1 3.8" />
                      <path d="M6.2 6.2a12.6 12.6 0 00-3.7 5 1.8 1.8 0 000 1.6C3.5 14.9 7 19 12 19a10 10 0 004.1-.9" />
                    </>
                  ) : (
                    <>
                      <path d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </span>
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <span className="password-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-visibility-btn"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {showConfirmPassword ? (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.1 9.5 6.2a1.8 1.8 0 010 1.6 12.5 12.5 0 01-3.1 3.8" />
                        <path d="M6.2 6.2a12.6 12.6 0 00-3.7 5 1.8 1.8 0 000 1.6C3.5 14.9 7 19 12 19a10 10 0 004.1-.9" />
                      </>
                    ) : (
                      <>
                        <path d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </span>
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : submitLabel}
          </button>
        </form>
        <button type="button" className="guest-entry-btn" onClick={onContinueAsGuest}>
          {isGuest ? 'Back to guest workspace' : 'Continue as guest'}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
