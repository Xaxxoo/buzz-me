'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminAuth } from '@/lib/admin-auth';
import { createApi } from '@/lib/api';

const I = { w: 20, h: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'grid': return <svg {...I}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case 'users': return <svg {...I}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case 'help': return <svg {...I}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'zap': return <svg {...I}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'layers': return <svg {...I}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
    case 'flag': return <svg {...I}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
    case 'building': return <svg {...I}><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
    default: return null;
  }
}

const NAV = [
  { href: '/admin', label: 'Overview', icon: 'grid' },
  { href: '/admin/users', label: 'Players', icon: 'users' },
  { href: '/admin/questions', label: 'Questions', icon: 'help' },
  { href: '/admin/matches', label: 'Matches', icon: 'zap' },
  { href: '/admin/categories', label: 'Categories', icon: 'layers' },
  { href: '/admin/reports', label: 'Reports', icon: 'flag' },
  { href: '/admin/universities', label: 'Universities', icon: 'building' },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authState = useSyncExternalStore(adminAuth.subscribe, adminAuth.getSnapshot, () => ({ status: 'loading' as const, user: null }));
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    // Only hydrate on cold page loads — skip if already authenticated from login
    if (adminAuth.getSnapshot().status === 'loading') adminAuth.hydrate();
  }, []);

  useEffect(() => {
    try { if (localStorage.getItem('admin-sidebar-collapsed') === 'true') setCollapsed(true); } catch {}
  }, []);

  useEffect(() => {
    if (authState.status === 'guest') {
      router.replace('/admin/login');
      return;
    }
    if (authState.status === 'authenticated') {
      const api = createApi(() => adminAuth.getToken(), async () => null);
      api.get<{ is_admin?: boolean; must_reset_password?: boolean }>('/users/me')
        .then((profile) => {
          if (!profile.is_admin) {
            router.replace('/admin/login');
          } else if (profile.must_reset_password) {
            router.replace('/admin/reset-password');
          } else {
            setIsAdmin(true);
          }
        })
        .catch(() => {
          router.replace('/admin/login');
        });
    }
  }, [authState.status, router]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('admin-sidebar-collapsed', String(next)); } catch {}
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await adminAuth.logout();
    router.replace('/admin/login');
  };

  if (authState.status === 'loading' || isAdmin === null) {
    return <div className="admin-loading"><div className="admin-loading-spinner" /></div>;
  }

  const currentPage = NAV.find(n => n.href === pathname);

  return (
    <div className={`admin-shell${collapsed ? ' collapsed' : ''}`}>
      <button className="admin-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {sidebarOpen
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></>
          }
        </svg>
      </button>
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link href="/admin" className="admin-logo" onClick={() => setSidebarOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" opacity="0.15"/>
              <path d="M8 16V8l8 4-8 4z" fill="currentColor"/>
            </svg>
            <span className="admin-logo-text">CT Admin</span>
          </Link>
        </div>
        <nav className="admin-nav">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`admin-nav-link${pathname === n.href ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? n.label : undefined}
            >
              <span className="admin-nav-icon"><Icon name={n.icon} /></span>
              <span className="admin-nav-label">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-nav-link" onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'} style={{ display: 'flex' }}>
            <span className="admin-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : undefined, transition: 'transform 200ms ease' }}>
                <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
              </svg>
            </span>
            <span className="admin-nav-label">Collapse</span>
          </button>
          <Link href="/" className="admin-nav-link" onClick={() => setSidebarOpen(false)} title={collapsed ? 'Back to App' : undefined}>
            <span className="admin-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </span>
            <span className="admin-nav-label">Back to App</span>
          </Link>
        </div>
      </aside>
      <main className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-topbar-title">{currentPage?.label ?? 'Admin'}</h1>
          </div>
          <div className="admin-topbar-right">
            <div className="admin-profile" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="admin-avatar">{authState.user?.username?.charAt(0).toUpperCase()}</div>
              <span className="admin-topbar-user">{authState.user?.username}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {profileOpen && (
              <>
                <div className="admin-profile-backdrop" onClick={() => setProfileOpen(false)} />
                <div className="admin-profile-dropdown">
                  <div className="admin-profile-info">
                    <div className="admin-avatar lg">{authState.user?.username?.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="admin-profile-name">{authState.user?.username}</div>
                      <div className="admin-profile-email">{authState.user?.email || 'Admin'}</div>
                    </div>
                  </div>
                  <div className="admin-profile-divider" />
                  <button className="admin-profile-item" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <div className="admin-body">{children}</div>
      </main>
    </div>
  );
}
