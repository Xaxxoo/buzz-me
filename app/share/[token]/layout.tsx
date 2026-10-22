import type { ReactNode } from 'react';

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Inter+Tight:wght@600;700&display=swap" />
      </head>
      <body style={{ margin: 0, background: '#0a0a09', color: '#f0ebe3', fontFamily: "'Inter Tight', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
