'use client';

import { useRef, useMemo, useEffect } from 'react';
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
 * Timer arc that drains from full circle to empty over `secs`.
 * Uses a THREE.Line with pre-allocated buffer — no geometry allocation per frame.
 */
export function TimerRing({ secs, timerKey, position, radius }: TimerRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lineObj = useRef<THREE.Line | null>(null);
  const arc = useTimerArc(secs, timerKey);
  const r = radius ?? (BUZZER_RADIUS + 0.4);
  const pos = position ?? [BUZZER_POS[0], BUZZER_POS[1] + 0.05, BUZZER_POS[2]];

  const segments = 64;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, [segments]);

  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: TIMER_COLOR,
    transparent: true,
    opacity: 0.9,
  }), []);

  // Create the Line object imperatively to avoid SVG <line> collision
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const line = new THREE.Line(geometry, material);
    line.visible = false;
    group.add(line);
    lineObj.current = line;
    return () => {
      try { group.remove(line); } catch { /* already gone */ }
      lineObj.current = null;
    };
  }, [geometry, material]);

  useFrame(() => {
    const line = lineObj.current;
    if (!line) return;

    if (secs <= 0 || arc.current <= 0.01) {
      line.visible = false;
      return;
    }
    line.visible = true;

    // Update positions in-place — no allocation
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const arcAngle = arc.current;
    const count = Math.max(2, Math.round((arcAngle / (Math.PI * 2)) * segments) + 1);

    for (let i = 0; i < count; i++) {
      const angle = (i / (count - 1)) * arcAngle;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = Math.sin(angle) * r;
      arr[i * 3 + 2] = 0;
    }

    posAttr.needsUpdate = true;
    geometry.setDrawRange(0, count);
  });

  return (
    <group ref={groupRef} position={pos} rotation={[-Math.PI / 2, 0, 0]} />
  );
}
