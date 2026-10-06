'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { confetti } from '@/lib/confetti';

/** The spinning sunburst, the confetti canvas and the full-screen flash when someone buzzes. */
export function Backdrop({ flashKey, flashColor }: { flashKey: number; flashColor: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => (canvas.current ? confetti.attach(canvas.current) : undefined), []);
  return (
    <>
      <div className="sky" aria-hidden="true"><div className="rays" /></div>
      <canvas id="fx" ref={canvas} aria-hidden="true" />
      <div key={flashKey} id="flash" className={'flash' + (flashKey ? ' go' : '')} aria-hidden="true" style={{ '--c': flashColor } as CSSProperties} />
    </>
  );
}
