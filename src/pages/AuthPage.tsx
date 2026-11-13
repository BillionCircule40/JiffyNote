import React, { useMemo, useState } from 'react';
import authService, { User } from '../services/authService';

interface AuthPageProps {
  onAuthenticated: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

      onAuthenticated(result.user);
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
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
