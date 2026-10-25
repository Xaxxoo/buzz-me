'use client';

import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { CampusBuilding3D } from '@/lib/campus-types';

interface BuildingLabelProps {
  building: CampusBuilding3D;
  progress: MutableRefObject<number>;
}

export function BuildingLabel({ building: b, progress }: BuildingLabelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const el = wrapRef.current;
    if (!el) return;
    const p = progress.current;
    if (p > 0.8) {
      const alpha = Math.min(1, (p - 0.8) / 0.2);
      el.style.opacity = String(alpha);
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  return (
    <Html
      position={[b.x, b.h + 4, b.y]}
      center
      distanceFactor={80}
      style={{ pointerEvents: 'none' }}
    >
      <div ref={wrapRef} className="campus-label" style={{ display: 'none' }}>
        <span className="campus-label-dot" style={{ background: b.color }} />
        <span className="campus-label-text">{b.name}</span>
      </div>
    </Html>
  );
}
