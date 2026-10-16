'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuth, adminApi } from '@/lib/admin-auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const authState = useSyncExternalStore(adminAuth.subscribe, adminAuth.getSnapshot, () => ({ status: 'loading' as const, user: null }));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { adminAuth.hydrate(); }, []);

  useEffect(() => {
    if (authState.status === 'guest') {
      router.replace('/admin/login');
    }
  }, [authState.status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await adminApi.changePassword(currentPassword, newPassword);
      router.replace('/admin');
    } catch (err: any) {
      setError(err?.message || 'Failed to change password.');
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
        <h1 className="admin-login-title">Change Password</h1>
        <p className="admin-login-sub">You must set a new password before continuing</p>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Current Password
            <input
              className="admin-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </label>
          <label>
            New Password
            <input
              className="admin-input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm New Password
            <input
              className="admin-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </label>
          {error && <p className="admin-login-error">{error}</p>}
          <button className="admin-btn" type="submit" disabled={busy}>
            {busy ? 'Changing\u2026' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
