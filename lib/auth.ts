import { createApi, type Api } from './api';
import { API_BASE, REFRESH_KEY, TOKEN_KEY } from './config';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  rating: number;
}

export type AuthStatus = 'loading' | 'guest' | 'authenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

export class AuthClient {
  private state: AuthState = { status: 'loading', user: null };
  private listeners = new Set<() => void>();
  private accessToken: string | null = null;
  private refreshInFlight: Promise<string | null> | null = null;
  api: Api;

  constructor() {
    this.api = createApi(() => this.accessToken, () => this.doRefresh());
  }

  /* ---------- store plumbing ---------- */
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.state;

  private set(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l());
  }

  getToken() { return this.accessToken; }

  /* ---------- lifecycle ---------- */
  async hydrate() {
    const storedToken = this.readStorage(TOKEN_KEY);
    const refreshToken = this.readStorage(REFRESH_KEY);

    if (!refreshToken && !storedToken) {
      this.set({ status: 'guest', user: null });
      return;
    }

    if (storedToken) {
      this.accessToken = storedToken;
    }

    // Try to refresh to validate the session and get a fresh token.
    if (refreshToken && storedToken) {
      try {
        await this.doRefresh();
        return; // success — doRefresh set state to authenticated
      } catch {
        // Refresh failed — fall through to use stored token directly.
        // Don't wipe tokens; the refresh endpoint may just be temporarily down.
      }
    }

    // Use the stored access token directly if we have one.
    // Tokens never expire server-side, so this always works.
    if (this.accessToken) {
      try {
        const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
        this.set({
          status: 'authenticated',
          user: this.state.user || { id: payload.sub, username: payload.username, email: '', rating: 1000 },
        });
        return;
      } catch { /* token is corrupt — fall through to guest */ }
    }

    this.accessToken = null;
    this.clearStorage(TOKEN_KEY);
    this.clearStorage(REFRESH_KEY);
    this.set({ status: 'guest', user: null });
  }

  async signup(username: string, email: string, password: string) {
    const res = await this.api.post<{ access_token: string; refresh_token: string; user: AuthUser }>(
      '/auth/signup',
      { username, email, password },
    );
    this.setTokens(res.access_token, res.refresh_token);
    this.set({ status: 'authenticated', user: res.user });
  }

  async login(identifier: string, password: string) {
    const res = await this.api.post<{ access_token: string; refresh_token: string; user: AuthUser }>(
      '/auth/login',
      { identifier, password },
    );
    this.setTokens(res.access_token, res.refresh_token);
    this.set({ status: 'authenticated', user: res.user });
  }

  async logout() {
    try { await this.api.post('/auth/logout'); } catch { /* best-effort */ }
    this.accessToken = null;
    this.clearStorage(TOKEN_KEY);
    this.clearStorage(REFRESH_KEY);
    this.set({ status: 'guest', user: null });
  }

  /* ---------- token management ---------- */
  private setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.writeStorage(TOKEN_KEY, access);
    this.writeStorage(REFRESH_KEY, refresh);
  }

  private async doRefresh(): Promise<string | null> {
    // Mutex: if a refresh is already in flight, piggyback on it
    // to avoid concurrent rotations that trigger token mismatch.
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = this._doRefreshInner();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private async _doRefreshInner(): Promise<string | null> {
    const refreshToken = this.readStorage(REFRESH_KEY);
    if (!refreshToken || !this.accessToken) return null;

    // Use direct fetch — NOT this.api — to avoid the circular
    // onUnauthorized → doRefresh → onUnauthorized loop.
    const raw = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!raw.ok) {
      throw new Error(`Refresh failed: ${raw.status}`);
    }

    const res: { access_token: string; refresh_token: string } = await raw.json();
    this.setTokens(res.access_token, res.refresh_token);

    // Decode user from the new token
    try {
      const payload = JSON.parse(atob(res.access_token.split('.')[1]));
      if (this.state.user) {
        this.set({ status: 'authenticated', user: { ...this.state.user, username: payload.username } });
      } else {
        // During hydration, reconstruct minimal user from JWT
        this.set({ status: 'authenticated', user: { id: payload.sub, username: payload.username, email: '', rating: 1000 } });
      }
    } catch { /* keep existing user */ }

    return res.access_token;
  }

  /* ---------- storage helpers ---------- */
  private readStorage(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private writeStorage(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* private window */ }
  }
  private clearStorage(key: string) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}
