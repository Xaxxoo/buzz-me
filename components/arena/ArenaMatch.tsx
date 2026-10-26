'use client';

import { Component, Suspense, useState, useEffect, type ReactNode } from 'react';
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

/** Catches Three.js crashes and falls back to the 2D match screen. */
class ArenaBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Drop-in replacement for Match.
 *
 * - If 3D is supported → loads ArenaCanvas (lazy, no SSR).
 * - If not → renders the existing flat Match component.
 * - The Canvas is only mounted while the match screen is active.
 *   When active becomes false the Canvas unmounts, releasing all
 *   GPU resources (textures, geometries, render loop).
 * - An error boundary catches any Three.js crash and falls back
 *   to the 2D match for the rest of the session.
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

  // Only mount the Canvas while the match screen is active.
  // This fully releases the WebGL context, textures, and render loop
  // when navigating to result/menu/etc.
  if (!props.active) {
    return <section className="screen match flex-auto min-h-0 flex flex-col" id="s-match" hidden />;
  }

  return (
    <ArenaBoundary fallback={<Match {...props} />}>
      <Suspense
        fallback={
          <section className="screen match enter flex-auto min-h-0 flex flex-col" id="s-match">
            <div className="arena-loading">
              <div className="arena-shimmer" />
            </div>
          </section>
        }
      >
        <ArenaCanvas {...props} />
      </Suspense>
    </ArenaBoundary>
  );
}
