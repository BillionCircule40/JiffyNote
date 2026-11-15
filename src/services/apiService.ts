const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
export const AUTH_TOKEN_KEY = 'jiffynote.auth.token';

export const apiRequest = async <T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (authenticated) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      message = body.error || message;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
};