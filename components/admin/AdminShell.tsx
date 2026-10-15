'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthClient } from '@/lib/auth';

const auth = new AuthClient();

const NAV = [
  { href: '/admin', label: 'Overview', icon: '\u25A3' },
  { href: '/admin/users', label: 'Users', icon: '\u263A' },
  { href: '/admin/questions', label: 'Questions', icon: '\u2753' },
  { href: '/admin/matches', label: 'Matches', icon: '\u2694' },
  { href: '/admin/categories', label: 'Categories', icon: '\u2630' },
  { href: '/admin/reports', label: 'Reports', icon: '\u26A0' },
  { href: '/admin/universities', label: 'Universities', icon: '\u1F3DB' },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authState = useSyncExternalStore(auth.subscribe, auth.getSnapshot, () => ({ status: 'loading' as const, user: null }));
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (authState.status === 'guest') {
      router.replace('/admin/login');
      return;
    }
    if (authState.status === 'authenticated') {
      auth.api.get<{ is_admin: boolean }>('/users/me').then(u => {
        if (!u.is_admin) router.replace('/admin/login');
        else setIsAdmin(true);
      }).catch(() => router.replace('/admin/login'));
    }
  }, [authState.status, router]);

  if (authState.status === 'loading' || isAdmin === null) {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div className="admin-shell">
      <button className="admin-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link href="/admin" className="admin-logo" onClick={() => setSidebarOpen(false)}>CT Admin</Link>
        </div>
        <nav className="admin-nav">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`admin-nav-link${pathname === n.href ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-nav-link" onClick={() => setSidebarOpen(false)}>
            &larr; Back to App
          </Link>
        </div>
      </aside>
      <main className="admin-content">
        <header className="admin-topbar">
          <h1 className="admin-topbar-title">
            {NAV.find(n => n.href === pathname)?.label ?? 'Admin'}
          </h1>
          <span className="admin-topbar-user">{authState.user?.username}</span>
        </header>
        <div className="admin-body">{children}</div>
      </main>
    </div>
  );
}
