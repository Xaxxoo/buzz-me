import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { decodeResult } from '@/lib/share';
import { GAME_NAME } from '@/lib/config';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = decodeResult(token);
  if (!data) return {};

  const title = data.k === 'm'
    ? `${data.ys} ${data.sy} – ${data.sr} ${data.rs} | ${GAME_NAME}`
    : `${data.ys} scored ${data.s} | ${GAME_NAME}`;

  const description = data.v;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const data = decodeResult(token);
  if (!data) redirect('/');

  const isMatch = data.k === 'm';

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '1.5rem',
      textAlign: 'center',
    }}>
      <p style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '1.1rem', opacity: 0.6, letterSpacing: '0.04em' }}>
        {GAME_NAME}
      </p>
      <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '2rem', margin: 0 }}>
        {isMatch ? `${data.ys} ${data.sy} – ${data.sr} ${data.rs}` : `${data.ys} scored ${data.s}`}
      </h1>
      <p style={{ fontSize: '1.1rem', opacity: 0.8 }}>{data.v}</p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '1rem',
          padding: '0.75rem 2rem',
          background: '#c6f432',
          color: '#0a0a09',
          fontWeight: 700,
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontSize: '1rem',
        }}
      >
        Play {GAME_NAME}
      </a>
    </div>
  );
}
