import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { SHAKE_DURATION } from '../shared/constants';

/**
 * Small camera position offset that decays over SHAKE_DURATION.
 * Triggered by incrementing `triggerKey` (matches the `@keyframes jolt` in CSS).
 *
 * Returns a ref with the current offset: [x, y, z].
 */
export function useCameraShake(triggerKey: number) {
  const offset = useRef<[number, number, number]>([0, 0, 0]);
  const elapsed = useRef(SHAKE_DURATION + 1); // start expired
  const prevKey = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey !== prevKey.current) {
      prevKey.current = triggerKey;
      elapsed.current = 0;
    }
  }, [triggerKey]);

  useFrame((_, delta) => {
    if (elapsed.current > SHAKE_DURATION) {
      offset.current = [0, 0, 0];
      return;
    }
    elapsed.current += delta;
    const t = elapsed.current / SHAKE_DURATION;
    const decay = 1 - t;
    const intensity = 0.15 * decay;
    offset.current = [
      Math.sin(t * 40) * intensity,
      Math.cos(t * 30) * intensity * 0.5,
      0,
    ];
  });

  return offset;
}
