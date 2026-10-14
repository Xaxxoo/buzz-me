'use client';

import { useState } from 'react';
import type { NotificationData } from '@/lib/types';

interface Props {
  notifications: NotificationData[];
  unreadCount: number;
  loading?: boolean;
  onOpen: () => void;
  onMarkAllRead: () => void;
}

export function NotificationBell({ notifications, unreadCount, loading, onOpen, onMarkAllRead }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpen();
  };

  return (
    <div className="notif-bell">
      <button className="bell-btn" type="button" aria-label="Notifications" onClick={toggle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <b>Notifications</b>
            {unreadCount > 0 && <button className="notif-mark-read" type="button" onClick={onMarkAllRead}>Mark all read</button>}
          </div>
          {loading && notifications.length === 0 ? (
            <p className="notif-empty">Loading&hellip;</p>
          ) : notifications.length === 0 ? (
            <p className="notif-empty">No notifications yet.</p>
          ) : (
            <div className="notif-list">
              {notifications.slice(0, 20).map(n => (
                <div key={n.id} className={'notif-item' + (n.read ? '' : ' unread')}>
                  <b>{n.title}</b>
                  <span>{n.body}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
