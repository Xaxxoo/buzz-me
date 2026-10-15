'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@/lib/auth';

const auth = new AuthClient();

export default function AdminLogin() {
  const router = useRouter();
  const authState = useSyncExternalStore(auth.subscribe, auth.getSnapshot, () => ({ status: 'loading' as const, user: null }));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { auth.hydrate(); }, []);

  // If already authenticated, check admin and redirect
  useEffect(() => {
    if (authState.status === 'authenticated') {
      auth.api.get<{ is_admin: boolean }>('/users/me').then(u => {
        if (u.is_admin) router.replace('/admin');
        else setError('This account does not have admin access.');
      }).catch(() => {});
    }
  }, [authState.status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier || !password) { setError('Fill in both fields.'); return; }
    setBusy(true);
    try {
      await auth.login(identifier, password);
      const user = await auth.api.get<{ is_admin: boolean }>('/users/me');
      if (!user.is_admin) {
        await auth.logout();
        setError('This account does not have admin access.');
      } else {
        router.replace('/admin');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  if (authState.status === 'loading') {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1 className="admin-login-title">CT Admin</h1>
        <p className="admin-login-sub">Sign in with your admin account</p>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Username or Email
            <input
              className="admin-input"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              className="admin-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="admin-login-error">{error}</p>}
          <button className="admin-btn" type="submit" disabled={busy}>
            {busy ? 'Signing in\u2026' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
