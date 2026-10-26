import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Shared CanvasTexture factory.
 * Takes a draw callback and deps; returns `{ texture, aspect }`.
 * Handles 2x DPI scaling, canvas creation, THREE.CanvasTexture creation,
 * and disposes previous textures when deps change.
 */
export function useCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => { w: number; h: number },
  deps: React.DependencyList,
): { texture: THREE.CanvasTexture; aspect: number } {
  const prevTexture = useRef<THREE.CanvasTexture | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => {
    // Dispose previous texture to prevent GPU memory leak
    if (prevTexture.current) {
      prevTexture.current.dispose();
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // First pass: measure
    const { w, h } = draw(ctx, canvas);

    // Set canvas size at 2x for retina
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // Second pass: actual draw
    draw(ctx, canvas);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    prevTexture.current = texture;
    return { texture, aspect: w / h };
  }, deps);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      if (prevTexture.current) {
        prevTexture.current.dispose();
        prevTexture.current = null;
      }
    };
  }, []);

  return result;
}
