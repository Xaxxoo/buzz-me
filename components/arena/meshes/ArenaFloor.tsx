'use client';

import { useRef, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOR_RADIUS, FLOOR_SEGMENTS, FLOOR_Y, ARENA_BG } from '../shared/constants';

interface ArenaFloorProps {
  accentColor?: string;
  progress: MutableRefObject<number>;
}

/** Large circular arena platform at y=0 with a subtle accent-colored edge ring. */
export function ArenaFloor({ accentColor = '#c6f432', progress }: ArenaFloorProps) {
  const groupRef = useRef<THREE.Group>(null);

  const ringMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accentColor, transparent: true, opacity: 0.15 }),
    [accentColor],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    // Phase 1: scale up 0 → 0.4
    const p = Math.min(progress.current / 0.4, 1);
    g.scale.set(p, 1, p);
  });

  return (
    <group ref={groupRef} position={[0, FLOOR_Y, 0]}>
      {/* Main floor disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[FLOOR_RADIUS, FLOOR_SEGMENTS]} />
        <meshStandardMaterial color={ARENA_BG} />
      </mesh>

      {/* Subtle accent ring at edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[FLOOR_RADIUS - 0.3, FLOOR_RADIUS, FLOOR_SEGMENTS]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
    </group>
  );
}
