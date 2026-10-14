import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { GAME_NAME } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  title: `${GAME_NAME} Buzzer Quiz`,
  description: 'The inter-university quiz. Hear the question, beat the other school to the buzzer.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFC629',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* To self-host the fonts instead, switch these to next/font/google and map the two CSS variables in globals.css. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Figtree:wght@500;600;800&display=swap" />
      </head>
      <body className="bg-sun text-ink font-body text-base overflow-hidden px-4 select-none">{children}</body>
    </html>
  );
}
