'use client';

import { useState } from 'react';
import type { AuthClient } from '@/lib/auth';

interface Props {
  active: boolean;
  auth: AuthClient;
  onLogin: () => void;
  onMenu: () => void;
}

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function validate(username: string, email: string, password: string): string | null {
  if (username.length < 3 || username.length > 20) return 'Username must be 3\u201320 characters.';
  if (!USERNAME_RE.test(username)) return 'Username must be letters, numbers, or underscores.';
  if (!email.includes('@')) return 'Enter a valid email.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

export function Signup({ active, auth, onLogin, onMenu }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(username, email, password);
    if (err) { setError(err); return; }
    setError('');
    setBusy(true);
    try {
      await auth.signup(username, email, password);
      onMenu();
    } catch (err: any) {
      setError(err?.message || 'Signup failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen enter flex-auto min-h-0 flex flex-col gap-3" id="s-signup" hidden={!active}>
      <div className="head shrink-0 flex items-center justify-between gap-2.5">
        <h2>Create account</h2>
        <button className="back" type="button" onClick={onMenu}>Menu</button>
      </div>
      <form className="auth-form flex flex-col gap-3.5 max-w-[380px] w-full mx-auto p-5 px-4" onSubmit={submit}>
        <label className="form-field flex flex-col gap-[5px]">
          <span>Username</span>
          <input className="form-input" type="text" autoComplete="username" maxLength={20} value={username} onChange={e => setUsername(e.target.value)} />
        </label>
        <label className="form-field flex flex-col gap-[5px]">
          <span>Email</span>
          <input className="form-input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="form-field flex flex-col gap-[5px]">
          <span>Password</span>
          <div className="relative">
            <input className="form-input w-full pr-10" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
            </button>
          </div>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Creating account\u2026' : 'Sign up'}</button>
        <p className="form-link">Already have an account? <button type="button" className="link" onClick={onLogin}>Sign in</button></p>
      </form>
    </section>
  );
}
