import { useEffect, useRef, useState } from 'react';

/** Animates a number toward `target` whenever it changes. Starts at `from` (defaults to the target itself). */
export function useCountUp(target: number, ms = 450, from?: number) {
  const [value, setValue] = useState(from ?? target);
  const shown = useRef(from ?? target);
  useEffect(() => {
    const a = shown.current;
    if (a === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms), eased = 1 - Math.pow(1 - k, 3);
      shown.current = a + (target - a) * eased;
      setValue(shown.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}
