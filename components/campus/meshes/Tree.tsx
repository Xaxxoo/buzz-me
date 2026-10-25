'use client';

import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

interface TreeProps {
  x: number;
  y: number;
  progress: MutableRefObject<number>;
}

const TRUNK_COLOR = '#5C4033';
const FOLIAGE = [
  { yFrac: 0.5, radius: 3.5, color: '#1B5E20' },
  { yFrac: 0.7, radius: 3.0, color: '#2E7D32' },
  { yFrac: 0.9, radius: 2.2, color: '#388E3C' },
];

export function Tree({ x, y, progress }: TreeProps) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const p = progress.current;
    const h = 6 * p;
    g.scale.set(1, p, 1);
    g.position.set(x, h * 0.5, y);
  });

  return (
    <group ref={groupRef} position={[x, 0, y]}>
      {/* trunk */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 6, 6]} />
        <meshStandardMaterial color={TRUNK_COLOR} />
      </mesh>

      {/* foliage spheres */}
      {FOLIAGE.map((layer, i) => (
        <mesh key={i} position={[0, (layer.yFrac - 0.5) * 6, 0]}>
          <sphereGeometry args={[layer.radius, 8, 6]} />
          <meshStandardMaterial color={layer.color} />
        </mesh>
      ))}
    </group>
  );
}
