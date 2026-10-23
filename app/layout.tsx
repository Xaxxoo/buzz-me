import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { GAME_NAME, API_BASE } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  title: `${GAME_NAME} Buzzer Quiz`,
  description: 'The inter-university quiz. Hear the question, beat the other school to the buzzer.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a09',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Expose API base to static pages (e.g. landing-preview) */}
        <script dangerouslySetInnerHTML={{ __html: `window.__API_BASE__=${JSON.stringify(API_BASE)};` }} />
        {/* To self-host the fonts instead, switch these to next/font/google and map the two CSS variables in globals.css. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Inter+Tight:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" />
      </head>
      <body className="bg-[#0a0a09] text-[#f0ebe3] font-body text-base overflow-hidden px-4 select-none">{children}</body>
    </html>
  );
}
