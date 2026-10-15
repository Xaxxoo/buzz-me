import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus Trivia Admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
