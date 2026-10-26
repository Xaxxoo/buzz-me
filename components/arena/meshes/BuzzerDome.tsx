'use client';

import { useRef, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUZZER_POS, BUZZER_RADIUS, BUZZER_BASE_RADIUS, BUZZER_BASE_HEIGHT, BUZZER_LIVE_COLOR, BUZZER_IDLE_COLOR } from '../shared/constants';
import { useBuzzerPulse } from '../hooks/useBuzzerPulse';
import { useCanvasTexture } from '../hooks/useCanvasTexture';

interface BuzzerDomeProps {
  buzzLive: boolean;
  onBuzz: () => void;
  progress: MutableRefObject<number>;
  visible?: boolean;
}

export function BuzzerDome({ buzzLive, onBuzz, progress, visible = true }: BuzzerDomeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const domeRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const { scale, ringScale, ringOpacity } = useBuzzerPulse(buzzLive);

  const liveMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: BUZZER_LIVE_COLOR,
    metalness: 0.6,
    roughness: 0.3,
    emissive: new THREE.Color(BUZZER_LIVE_COLOR),
    emissiveIntensity: 0.3,
  }), []);

  const idleMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: BUZZER_IDLE_COLOR,
    metalness: 0.4,
    roughness: 0.5,
  }), []);

  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: BUZZER_LIVE_COLOR,
    transparent: true,
    opacity: 0,
    emissive: new THREE.Color(BUZZER_LIVE_COLOR),
    emissiveIntensity: 0.5,
  }), []);

  // Label sprite
  const label = buzzLive ? 'Buzz' : 'Wait';
  const { texture, aspect } = useCanvasTexture((ctx, canvas) => {
    const font = '700 36px Inter Tight, system-ui, sans-serif';
    ctx.font = font;
    const w = Math.max(80, ctx.measureText(label).width + 30);
    const h = 44;
    if (canvas.width > 0) {
      ctx.font = font;
      ctx.fillStyle = buzzLive ? '#ffffff' : '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2);
    }
    return { w, h };
  }, [label, buzzLive]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.visible = visible;
    if (!visible) return;
    // Phase 1: 0 → 0.4
    const p = Math.min(progress.current / 0.4, 1);
    g.scale.set(p || 0.001, p || 0.001, p || 0.001);

    // Dome pulse
    const d = domeRef.current;
    if (d) {
      d.scale.setScalar(scale.current);
      d.material = buzzLive ? liveMat : idleMat;
    }

    // Ring animation
    const r = ringRef.current;
    if (r) {
      r.scale.set(ringScale.current, ringScale.current, 1);
      ringMat.opacity = ringOpacity.current;
    }
  });

  const spriteH = 0.8;

  return (
    <group ref={groupRef} position={BUZZER_POS}>
      {/* Base cylinder */}
      <mesh position={[0, BUZZER_BASE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[BUZZER_BASE_RADIUS, BUZZER_BASE_RADIUS * 1.2, BUZZER_BASE_HEIGHT, 24]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Dome hemisphere */}
      <mesh
        ref={domeRef}
        position={[0, BUZZER_BASE_HEIGHT, 0]}
        rotation={[0, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onBuzz(); }}
        onPointerDown={(e) => { e.stopPropagation(); onBuzz(); }}
      >
        <sphereGeometry args={[BUZZER_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={buzzLive ? liveMat : idleMat} attach="material" />
      </mesh>

      {/* Pulsing ring */}
      <mesh ref={ringRef} position={[0, BUZZER_BASE_HEIGHT + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[BUZZER_RADIUS + 0.1, 0.06, 8, 48]} />
        <primitive object={ringMat} attach="material" />
      </mesh>

      {/* Label sprite above */}
      <sprite position={[0, BUZZER_RADIUS + BUZZER_BASE_HEIGHT + 0.6, 0]} scale={[spriteH * aspect, spriteH, 1]}>
        <spriteMaterial map={texture} transparent depthTest={false} />
      </sprite>
    </group>
  );
}
