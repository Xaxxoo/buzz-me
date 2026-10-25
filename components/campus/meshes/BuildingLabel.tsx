'use client';

import type { MutableRefObject } from 'react';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CampusBuilding3D } from '@/lib/campus-types';

interface BuildingLabelProps {
  building: CampusBuilding3D;
  progress: MutableRefObject<number>;
}

/**
 * Sprite-based building label (no DOM portals — avoids <Html> crashes in Next.js).
 * Uses a canvas texture to render the label text.
 */
export function BuildingLabel({ building: b, progress }: BuildingLabelProps) {
  const spriteRef = useRef<THREE.Sprite>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = '600 28px Inter Tight, system-ui, sans-serif';
    ctx.font = font;
    const textWidth = ctx.measureText(b.name).width;
    const dotR = 7;
    const padX = 24;
    const padY = 14;
    const gap = 12;
    const w = dotR * 2 + gap + textWidth + padX * 2;
    const h = 44;

    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // pill background
    ctx.fillStyle = 'rgba(10,10,9,0.88)';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, h / 2);
    ctx.fill();

    // colored dot
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(padX + dotR, h / 2, dotR, 0, Math.PI * 2);
    ctx.fill();

    // text
    ctx.font = font;
    ctx.fillStyle = '#f0ebe3';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.name, padX + dotR * 2 + gap, h / 2 + 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return { tex, aspect: w / h };
  }, [b.name, b.color]);

  useFrame(() => {
    const s = spriteRef.current;
    if (!s) return;
    const p = progress.current;
    if (p > 0.8) {
      s.visible = true;
      s.material.opacity = Math.min(1, (p - 0.8) / 0.2);
    } else {
      s.visible = false;
    }
  });

  const labelH = 4;
  const labelW = labelH * texture.aspect;

  return (
    <sprite
      ref={spriteRef}
      position={[b.x, b.h + 4, b.y]}
      scale={[labelW, labelH, 1]}
      visible={false}
    >
      <spriteMaterial
        map={texture.tex}
        transparent
        opacity={0}
        depthTest={false}
        sizeAttenuation={false}
      />
    </sprite>
  );
}
