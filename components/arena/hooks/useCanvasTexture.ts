import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Shared CanvasTexture factory.
 * Takes a draw callback and deps; returns `{ texture, aspect }`.
 * Handles 2x DPI scaling, canvas creation, and THREE.CanvasTexture lifecycle.
 *
 * Reuses the pattern from campus BuildingLabel.tsx.
 */
export function useCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => { w: number; h: number },
  deps: React.DependencyList,
): { texture: THREE.CanvasTexture; aspect: number } {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
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
    return { texture, aspect: w / h };
  }, deps);
}
