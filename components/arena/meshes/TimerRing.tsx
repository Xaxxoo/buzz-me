'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUZZER_POS, BUZZER_RADIUS, TIMER_COLOR } from '../shared/constants';
import { useTimerArc } from '../hooks/useTimerArc';

interface TimerRingProps {
  secs: number;
  timerKey: number;
  position?: [number, number, number];
  radius?: number;
}

/**
 * Torus arc that drains from full circle to empty over `secs`.
 * Defaults to wrapping around the buzzer dome.
 */
export function TimerRing({ secs, timerKey, position, radius }: TimerRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const arc = useTimerArc(secs, timerKey);
  const r = radius ?? (BUZZER_RADIUS + 0.4);
  const pos = position ?? [BUZZER_POS[0], BUZZER_POS[1] + 0.05, BUZZER_POS[2]];

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: TIMER_COLOR,
    emissive: new THREE.Color(TIMER_COLOR),
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.9,
  }), []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    if (secs <= 0 || arc.current <= 0.01) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // Rebuild torus arc geometry on the fly (lightweight)
    const existing = g.children[0] as THREE.Mesh | undefined;
    if (existing) {
      existing.geometry.dispose();
      existing.geometry = new THREE.TorusGeometry(r, 0.06, 8, 48, arc.current);
    }
  });

  return (
    <group ref={groupRef} position={pos} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <mesh>
        <torusGeometry args={[r, 0.06, 8, 48, Math.PI * 2]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}
