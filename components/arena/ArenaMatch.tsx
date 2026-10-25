'use client';

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { checkCapabilities } from '@/lib/capabilities';
import { Match } from '@/components/screens/Match';
import type { GameState } from '@/lib/engine';

const ArenaCanvas = dynamic(() => import('./ArenaCanvas'), { ssr: false });

interface Props {
  active: boolean;
  s: GameState;
  boardKey: string;
  onBuzz: () => void;
  onAnswer: (text: string) => void;
  onAcceptBot?: () => void;
  onDismissBot?: () => void;
  onCancelFind?: () => void;
  onJoinPrivate?: (code: string) => void;
  onCancelPrivate?: () => void;
}

/**
 * Drop-in replacement for Match.
 * If 3D is supported → loads ArenaCanvas (lazy, no SSR).
 * Otherwise → renders the existing flat Match component.
 */
export function ArenaMatch(props: Props) {
  const [can3D, setCan3D] = useState<boolean | null>(null);

  useEffect(() => {
    setCan3D(checkCapabilities().canRender3D);
  }, []);

  // Still checking capabilities
  if (can3D === null) {
    return (
      <section className="screen match enter flex-auto min-h-0 flex flex-col" id="s-match" hidden={!props.active}>
        <div className="arena-loading">
          <div className="arena-shimmer" />
        </div>
      </section>
    );
  }

  // Fallback to flat 2D
  if (!can3D) {
    return <Match {...props} />;
  }

  return (
    <Suspense
      fallback={
        <section className="screen match enter flex-auto min-h-0 flex flex-col" id="s-match" hidden={!props.active}>
          <div className="arena-loading">
            <div className="arena-shimmer" />
          </div>
        </section>
      }
    >
      <ArenaCanvas {...props} />
    </Suspense>
  );
}
