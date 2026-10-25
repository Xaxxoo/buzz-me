'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface CampusPathProps {
  points: [number, number][];
}

export function CampusPath({ points }: CampusPathProps) {
  if (points.length < 2) return null;

  const lineObj = useMemo(() => {
    const pts = points.map(([px, py]) => new THREE.Vector3(px, 0.05, py));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 'rgb(220,210,190)', transparent: true, opacity: 0.15 });
    return new THREE.Line(geo, mat);
  }, [points]);

  return <primitive object={lineObj} />;
}
