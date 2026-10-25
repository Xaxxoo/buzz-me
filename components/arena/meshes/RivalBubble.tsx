'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PODIUM_RIVAL_POS, PODIUM_HEIGHT, MARK_COLORS } from '../shared/constants';
import { useCanvasTexture } from '../hooks/useCanvasTexture';
import type { RivalView } from '@/lib/engine';

interface RivalBubbleProps {
  rivalView: RivalView | null;
  visible: boolean;
}

/** Speech bubble above rival podium showing what they chose / are doing. */
export function RivalBubble({ rivalView, visible }: RivalBubbleProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const elapsed = useRef(0);

  const small = rivalView?.small ?? '';
  const big = rivalView?.big ?? null;
  const mark = rivalView?.mark ?? '';
  const dots = !big;

  const bg = mark === 'right' ? MARK_COLORS.right
    : mark === 'wrong' ? MARK_COLORS.wrong
    : '#1e1e1c';

  const { texture, aspect } = useCanvasTexture((ctx, canvas) => {
    const font = '600 24px Inter Tight, system-ui, sans-serif';
    ctx.font = font;
    const content = big || '...';
    const textW = Math.max(ctx.measureText(small).width, ctx.measureText(content).width);
    const padX = 30;
    const padY = 20;
    const w = textW + padX * 2;
    const h = 80 + padY;
    if (canvas.width > 0) {
      // Pill background with tail
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h - 10, 14);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(w / 2 - 8, h - 10);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(w / 2 + 8, h - 10);
      ctx.fill();

      // Small label
      ctx.font = '500 18px Inter Tight, system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(small, w / 2, 12);

      // Big text or dots
      ctx.font = '700 28px Inter Tight, system-ui, sans-serif';
      ctx.fillStyle = '#f0ebe3';
      ctx.textBaseline = 'middle';
      ctx.fillText(content, w / 2, h / 2 + 8);
    }
    return { w, h };
  }, [small, big, dots, bg]);

  useFrame((_, delta) => {
    const s = spriteRef.current;
    if (!s) return;
    if (!visible || !rivalView) {
      s.visible = false;
      elapsed.current = 0;
      return;
    }
    s.visible = true;
    elapsed.current += delta;
    // Entrance: scale up
    const t = Math.min(elapsed.current / 0.25, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const h = 2;
    s.scale.set(h * aspect * ease, h * ease, 1);
    s.material.opacity = ease;
  });

  const y = PODIUM_RIVAL_POS[1] + PODIUM_HEIGHT + 2.5;

  return (
    <sprite
      ref={spriteRef}
      position={[PODIUM_RIVAL_POS[0], y, PODIUM_RIVAL_POS[2]]}
      visible={false}
    >
      <spriteMaterial map={texture} transparent opacity={0} depthTest={false} />
    </sprite>
  );
}
