import { createApi, type Api } from './api';
import { REFRESH_KEY, TOKEN_KEY } from './config';

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

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch { return null; }
}

export class AuthClient {
  private state: AuthState = { status: 'loading', user: null };
  private listeners = new Set<() => void>();
  private accessToken: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
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

    if (!refreshToken) {
      this.set({ status: 'guest', user: null });
      return;
    }

    // Try to use the stored access token to refresh
    if (storedToken) {
      this.accessToken = storedToken;
      try {
        await this.doRefresh();
        return; // success — doRefresh set state to authenticated
      } catch {
        // token expired or invalid — fall through
      }
    }

    // Can't refresh without a valid access token — guest
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
    this.scheduleRefresh();
  }

  async login(email: string, password: string) {
    const res = await this.api.post<{ access_token: string; refresh_token: string; user: AuthUser }>(
      '/auth/login',
      { email, password },
    );
    this.setTokens(res.access_token, res.refresh_token);
    this.set({ status: 'authenticated', user: res.user });
    this.scheduleRefresh();
  }

  async logout() {
    try { await this.api.post('/auth/logout'); } catch { /* best-effort */ }
    this.accessToken = null;
    this.clearStorage(TOKEN_KEY);
    this.clearStorage(REFRESH_KEY);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.set({ status: 'guest', user: null });
  }

  /* ---------- token management ---------- */
  private setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.writeStorage(TOKEN_KEY, access);
    this.writeStorage(REFRESH_KEY, refresh);
  }

  private async doRefresh(): Promise<string | null> {
    const refreshToken = this.readStorage(REFRESH_KEY);
    if (!refreshToken || !this.accessToken) return null;

    const res = await this.api.post<{ access_token: string; refresh_token: string }>(
      '/auth/refresh',
      { refresh_token: refreshToken },
    );
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

    this.scheduleRefresh();
    return res.access_token;
  }

  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!this.accessToken) return;

    const exp = decodeJwtExp(this.accessToken);
    if (!exp) return;

    // Refresh 60 seconds before expiry, minimum 5 seconds from now
    const ms = Math.max((exp * 1000 - Date.now()) - 60_000, 5_000);
    this.refreshTimer = setTimeout(() => {
      this.doRefresh().catch(() => {
        // Exponential backoff retry
        this.retryRefresh(1);
      });
    }, ms);
  }

  private retryRefresh(attempt: number) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
    this.refreshTimer = setTimeout(() => {
      this.doRefresh().catch(() => this.retryRefresh(attempt + 1));
    }, delay);
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
