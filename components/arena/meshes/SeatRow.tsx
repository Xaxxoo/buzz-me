'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SEAT_COUNT, SEAT_RADIUS } from '../shared/constants';

interface SeatRowProps {
  progress: MutableRefObject<number>;
}

/**
 * Semicircle of simple box seats behind the arena.
 * Uses InstancedMesh for ~48 seats — adds atmosphere, no interaction.
 */
export function SeatRow({ progress }: SeatRowProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(0.5, 0.7, 0.5), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a28', roughness: 0.8 }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Phase 3: fade in 0.7 → 1.0
    const p = progress.current < 0.7 ? 0 : Math.min((progress.current - 0.7) / 0.3, 1);
    mesh.visible = p > 0;
    if (!mesh.visible) return;

    for (let i = 0; i < SEAT_COUNT; i++) {
      // Semicircle from -150° to -30° (behind arena)
      const angle = (-150 + (120 / (SEAT_COUNT - 1)) * i) * (Math.PI / 180);
      // Two rows
      const row = i % 2;
      const r = SEAT_RADIUS + row * 1.2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 0.35 + row * 0.5;

      dummy.position.set(x, y * p, z);
      dummy.scale.setScalar(p);
      // Face center
      dummy.lookAt(0, y * p, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, SEAT_COUNT]}
      visible={false}
    />
  );
}
