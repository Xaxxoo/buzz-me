import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BUZZER_PULSE_PERIOD } from '../shared/constants';

/**
 * When `active` is true, oscillates a scale value (1.0 → 1.05 → 1.0) and
 * drives an expanding ring opacity (1 → 0).
 *
 * Returns refs for:
 * - `scale`: current dome scale multiplier
 * - `ringScale`: expanding ring scale (1 → 2)
 * - `ringOpacity`: fading opacity (1 → 0)
 */
export function useBuzzerPulse(active: boolean) {
  const scale = useRef(1);
  const ringScale = useRef(1);
  const ringOpacity = useRef(0);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!active) {
      scale.current = 1;
      ringOpacity.current = 0;
      elapsed.current = 0;
      return;
    }

    elapsed.current += delta;
    const t = (elapsed.current % BUZZER_PULSE_PERIOD) / BUZZER_PULSE_PERIOD;

    // Sine-based pulse: 1.0 → 1.05 → 1.0
    scale.current = 1 + 0.05 * Math.sin(t * Math.PI * 2);

    // Ring expands and fades over the cycle
    ringScale.current = 1 + t;
    ringOpacity.current = 1 - t;
  });

  return { scale, ringScale, ringOpacity };
}
