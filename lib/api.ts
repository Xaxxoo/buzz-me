import { API_BASE } from './config';
import type { Question } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Shape returned by the server's question entity (with category relation loaded). */
export interface DbQuestion {
  id: string;
  category_id: string;
  category: { id: string; name: string; slug: string };
  difficulty: string;
  text: string;
  options: string[];
  correct_option_index: number;
  bonus_text: string | null;
  bonus_options: string[] | null;
  source: string | null;
  active: boolean;
  created_at: string;
}

/** Map a DB question row into the compact frontend Question shape. */
export function mapQuestion(q: DbQuestion): Question {
  return {
    t: q.text,
    o: q.options,
    c: q.category.name,
    b: {
      t: q.bonus_text ?? q.text,
      o: q.bonus_options ?? q.options,
    },
  };
}

export interface Api {
  get<T = any>(path: string): Promise<T>;
  post<T = any>(path: string, body?: unknown): Promise<T>;
  put<T = any>(path: string, body?: unknown): Promise<T>;
  patch<T = any>(path: string, body?: unknown): Promise<T>;
  del<T = any>(path: string): Promise<T>;
}

export function createApi(getToken: () => string | null, onUnauthorized: () => Promise<string | null>): Api {
  async function request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !retried) {
      const newToken = await onUnauthorized();
      if (newToken) return request<T>(method, path, body, true);
    }

    if (!res.ok) {
      const text = await res.text();
      let message: string;
      try { message = JSON.parse(text).message ?? text; } catch { message = text; }
      throw new ApiError(res.status, message);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : (undefined as T);
  }

  return {
    get: <T,>(path: string) => request<T>('GET', path),
    post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
    put: <T,>(path: string, body?: unknown) => request<T>('PUT', path, body),
    patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    del: <T,>(path: string) => request<T>('DELETE', path),
  };
}
