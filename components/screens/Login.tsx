'use client';

import { useState } from 'react';
import type { AuthClient } from '@/lib/auth';

interface Props {
  active: boolean;
  auth: AuthClient;
  onSignup: () => void;
  onMenu: () => void;
}

export function Login({ active, auth, onSignup, onMenu }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier || !password) { setError('Fill in both fields.'); return; }
    setBusy(true);
    try {
      await auth.login(identifier, password);
      onMenu();
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen enter flex-auto min-h-0 flex flex-col gap-3" id="s-login" hidden={!active}>
      <div className="head shrink-0 flex items-center justify-between gap-2.5">
        <h2>Sign in</h2>
        <button className="back" type="button" onClick={onMenu}>Menu</button>
      </div>
      <form className="auth-form flex flex-col gap-3.5 max-w-[380px] w-full mx-auto p-5 px-4" onSubmit={submit}>
        <label className="form-field flex flex-col gap-[5px]">
          <span>Username or Email</span>
          <input className="form-input" type="text" autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} />
        </label>
        <label className="form-field flex flex-col gap-[5px]">
          <span>Password</span>
          <input className="form-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in\u2026' : 'Sign in'}</button>
        <p className="form-link">Don&apos;t have an account? <button type="button" className="link" onClick={onSignup}>Sign up</button></p>
      </form>
    </section>
  );
}
