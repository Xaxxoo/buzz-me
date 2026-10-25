'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface GroundProps {
  groundColor: string;
}

export function Ground({ groundColor }: GroundProps) {
  const gridLines = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 100; i += 10) {
      // line along x at z = i
      pts.push(-5, 0, i, 105, 0, i);
      // line along z at x = i
      pts.push(i, 0, -5, i, 0, 105);
    }
    const buf = new Float32Array(pts);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    return geo;
  }, []);

  return (
    <group>
      {/* ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, 0, 50]}>
        <planeGeometry args={[110, 110]} />
        <meshStandardMaterial color={groundColor} />
      </mesh>

      {/* grid lines */}
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.03} />
      </lineSegments>
    </group>
  );
}
