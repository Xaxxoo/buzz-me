import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ENTRANCE_DURATION } from '../shared/constants';

/**
 * Arena entrance animation: 0 → 1 over ENTRANCE_DURATION.
 *
 * Three phases (consumers map progress to visibility):
 *  - Phase 1 (0–0.4): floor + podiums scale up
 *  - Phase 2 (0.4–0.7): question board slides down
 *  - Phase 3 (0.7–1.0): details (labels, pips, seats) fade in
 *
 * Returns a mutable ref so mesh components can read it cheaply inside useFrame.
 */
export function useArenaEntrance() {
  const elapsed = useRef(0);
  const progress = useRef(0);

  useFrame((_, delta) => {
    if (progress.current >= 1) return;
    elapsed.current = Math.min(elapsed.current + delta, ENTRANCE_DURATION);
    const t = elapsed.current / ENTRANCE_DURATION;
    progress.current = 1 - Math.pow(1 - t, 3); // ease-out cubic
  });

  return progress;
}
