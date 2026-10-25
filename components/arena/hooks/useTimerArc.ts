import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Returns a mutable ref holding an arc angle that drains from 2PI → 0 over `secs`.
 * Resets when `key` changes. Returns 0 when secs is 0.
 */
export function useTimerArc(secs: number, key: number) {
  const arc = useRef(Math.PI * 2);
  const elapsed = useRef(0);
  const activeSecs = useRef(secs);
  const activeKey = useRef(key);

  // Reset on key change
  useEffect(() => {
    if (key !== activeKey.current) {
      activeKey.current = key;
      elapsed.current = 0;
      arc.current = Math.PI * 2;
      activeSecs.current = secs;
    }
  }, [key, secs]);

  useFrame((_, delta) => {
    if (activeSecs.current <= 0) {
      arc.current = 0;
      return;
    }
    elapsed.current = Math.min(elapsed.current + delta, activeSecs.current);
    const pct = 1 - elapsed.current / activeSecs.current;
    arc.current = pct * Math.PI * 2;
  });

  return arc;
}
