import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const DURATION = 0.8; // seconds

/**
 * Drives an entrance animation progress from 0 -> 1 over ~0.8s.
 * Uses ease-out cubic: 1 - (1 - t)^3 — matches the Canvas2D prototype.
 */
export function useEntranceAnimation() {
  const elapsed = useRef(0);
  const progress = useRef(0);

  useFrame((_, delta) => {
    if (progress.current >= 1) return;
    elapsed.current = Math.min(elapsed.current + delta, DURATION);
    const t = elapsed.current / DURATION;
    progress.current = 1 - Math.pow(1 - t, 3); // ease-out cubic
  });

  return progress;
}
