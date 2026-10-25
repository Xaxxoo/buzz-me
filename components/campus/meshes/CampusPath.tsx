'use client';

import { Line } from '@react-three/drei';

interface CampusPathProps {
  points: [number, number][];
}

export function CampusPath({ points }: CampusPathProps) {
  if (points.length < 2) return null;

  // Convert 2D campus coords (x, y) -> Three.js (x, 0.05, z)
  const pts: [number, number, number][] = points.map(([px, py]) => [px, 0.05, py]);

  return (
    <group>
      {/* wider backing strip */}
      <Line
        points={pts}
        color="rgb(220,210,190)"
        transparent
        opacity={0.06}
        lineWidth={4}
      />
      {/* narrower top line */}
      <Line
        points={pts}
        color="rgb(220,210,190)"
        transparent
        opacity={0.12}
        lineWidth={2}
      />
    </group>
  );
}
