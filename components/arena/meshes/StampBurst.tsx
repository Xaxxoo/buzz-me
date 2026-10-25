'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STAMP_DURATION } from '../shared/constants';
import { useCanvasTexture } from '../hooks/useCanvasTexture';

interface StampBurstProps {
  stamp: { key: number; text: string; team: 'you' | 'rival' } | null;
  teamColor: string;
}

/** Large text stamp that slams in (scale 2.6→1 with rotation) then fades. */
export function StampBurst({ stamp, teamColor }: StampBurstProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const elapsed = useRef(STAMP_DURATION + 1);
  const prevKey = useRef(0);

  const text = stamp?.text ?? '';
  const color = teamColor;

  const { texture, aspect } = useCanvasTexture((ctx, canvas) => {
    const font = '900 72px Inter Tight, system-ui, sans-serif';
    ctx.font = font;
    const w = Math.max(200, ctx.measureText(text || 'X').width + 60);
    const h = 100;
    if (canvas.width > 0 && text) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(text, w / 2, h / 2);
    }
    return { w, h };
  }, [text, color]);

  useEffect(() => {
    if (stamp && stamp.key !== prevKey.current) {
      prevKey.current = stamp.key;
      elapsed.current = 0;
    }
  }, [stamp]);

  useFrame((_, delta) => {
    const s = spriteRef.current;
    if (!s) return;

    if (elapsed.current > STAMP_DURATION) {
      s.visible = false;
      return;
    }

    elapsed.current += delta;
    const t = Math.min(elapsed.current / STAMP_DURATION, 1);

    s.visible = true;

    // Scale: 2.6 → 1 (slam), then hold
    const scaleT = t < 0.3 ? 2.6 - (2.6 - 1) * (t / 0.3) : 1;
    const baseH = 3;
    s.scale.set(baseH * aspect * scaleT, baseH * scaleT, 1);

    // Slight rotation on entry
    s.material.rotation = t < 0.3 ? (1 - t / 0.3) * 0.15 : 0;

    // Fade out in final 30%
    s.material.opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  });

  return (
    <sprite ref={spriteRef} position={[0, 4, 2]} visible={false}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}
