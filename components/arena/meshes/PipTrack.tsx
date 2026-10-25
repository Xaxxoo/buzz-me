'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PIP_SIZE, MARK_COLORS } from '../shared/constants';
import type { Took } from '@/lib/engine';

interface PipTrackProps {
  total: number;
  took: (Took | undefined)[];
  qi: number;
  progress: MutableRefObject<number>;
}

const pipColor = (took: Took | undefined, isCurrent: boolean): THREE.Color => {
  if (took === 'you') return new THREE.Color(MARK_COLORS.right);
  if (took === 'rival' || took === 'none') return new THREE.Color(MARK_COLORS.wrong);
  if (isCurrent) return new THREE.Color('#c6f432');
  return new THREE.Color('#333333');
};

/**
 * Row of small instanced cubes along the back of the arena.
 * Uses InstancedMesh for performance (matching plan's performance budget).
 */
export function PipTrack({ total, took, qi, progress }: PipTrackProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(PIP_SIZE, PIP_SIZE, PIP_SIZE), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || total === 0) return;

    // Phase 3: fade in 0.7 → 1.0
    const p = progress.current < 0.7 ? 0 : Math.min((progress.current - 0.7) / 0.3, 1);
    mesh.visible = p > 0;
    if (!mesh.visible) return;

    const spacing = PIP_SIZE * 2;
    const totalWidth = (total - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < total; i++) {
      dummy.position.set(startX + i * spacing, 0.3, -6);
      dummy.scale.setScalar(p);

      // Current pip pulses
      const isCurrent = i === qi;
      if (isCurrent) {
        const pulse = 1 + 0.3 * Math.sin(Date.now() / 300);
        dummy.scale.setScalar(p * pulse);
      }

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.copy(pipColor(took[i], isCurrent));
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  if (total === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, total]}
      visible={false}
    />
  );
}
