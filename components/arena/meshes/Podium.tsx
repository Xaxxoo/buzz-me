'use client';

import { useRef, useMemo, useEffect, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PODIUM_WIDTH, PODIUM_HEIGHT, PODIUM_DEPTH, CHIP_DURATION } from '../shared/constants';
import { podiumMaterials } from '../shared/materials';
import { useCanvasTexture } from '../hooks/useCanvasTexture';
import type { Team } from '@/lib/types';

interface PodiumProps {
  position: [number, number, number];
  color: string;
  name: string;
  score: number;
  seat: { team: Team; idx: number } | null;
  team: Team;
  progress: MutableRefObject<number>;
}

/** Score sprite above the podium */
function ScoreSprite({ score, position }: { score: number; position: [number, number, number] }) {
  const display = (score < 0 ? '\u2212' : '') + Math.abs(Math.round(score));
  const { texture, aspect } = useCanvasTexture((ctx, canvas) => {
    const font = '700 48px Inter Tight, system-ui, sans-serif';
    ctx.font = font;
    const w = Math.max(100, ctx.measureText(display).width + 40);
    const h = 60;
    if (canvas.width > 0) {
      ctx.fillStyle = 'rgba(10,10,9,0.75)';
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 12);
      ctx.fill();
      ctx.font = font;
      ctx.fillStyle = '#f0ebe3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(display, w / 2, h / 2);
    }
    return { w, h };
  }, [display]);

  const spriteH = 1.2;
  return (
    <sprite position={position} scale={[spriteH * aspect, spriteH, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

/** Name label on podium front */
function NameSprite({ name, position }: { name: string; position: [number, number, number] }) {
  const { texture, aspect } = useCanvasTexture((ctx, canvas) => {
    const font = '600 28px Inter Tight, system-ui, sans-serif';
    ctx.font = font;
    const w = Math.max(80, ctx.measureText(name).width + 30);
    const h = 36;
    if (canvas.width > 0) {
      ctx.font = font;
      ctx.fillStyle = '#f0ebe3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, w / 2, h / 2);
    }
    return { w, h };
  }, [name]);

  const spriteH = 0.7;
  return (
    <sprite position={position} scale={[spriteH * aspect, spriteH, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

/** Floating +10/−5 chip that rises and fades */
function ScoreChip({ delta, position }: { delta: number; position: [number, number, number] }) {
  const ref = useRef<THREE.Sprite>(null);
  const elapsed = useRef(0);
  const text = (delta > 0 ? '+' : '\u2212') + Math.abs(delta);
  const color = delta > 0 ? '#22c55e' : '#ef4444';

  const { texture, aspect } = useCanvasTexture((ctx, canvas) => {
    const font = '700 40px Inter Tight, system-ui, sans-serif';
    ctx.font = font;
    const w = Math.max(70, ctx.measureText(text).width + 30);
    const h = 50;
    if (canvas.width > 0) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2);
    }
    return { w, h };
  }, [text, color]);

  useFrame((_, dt) => {
    const s = ref.current;
    if (!s) return;
    elapsed.current += dt;
    const t = elapsed.current / CHIP_DURATION;
    if (t >= 1) { s.visible = false; return; }
    s.position.y = position[1] + t * 2;
    s.material.opacity = 1 - t;
  });

  const h = 0.9;
  return (
    <sprite ref={ref} position={position} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

export function Podium({ position, color, name, score, seat, team, progress }: PodiumProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materials = useMemo(() => podiumMaterials(color), [color]);
  const lastScore = useRef(score);
  const [chips, setChips] = useState<{ id: number; d: number }[]>([]);

  useEffect(() => {
    const d = score - lastScore.current;
    lastScore.current = score;
    if (!d) return;
    const id = performance.now() + Math.random();
    setChips(c => [...c, { id, d }]);
    setTimeout(() => setChips(c => c.filter(x => x.id !== id)), CHIP_DURATION * 1000 + 50);
  }, [score]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    // Phase 1: 0 → 0.4
    const p = Math.min(progress.current / 0.4, 1);
    g.scale.set(p || 0.001, p || 0.001, p || 0.001);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Main podium box */}
      <mesh position={[0, PODIUM_HEIGHT / 2, 0]} material={materials}>
        <boxGeometry args={[PODIUM_WIDTH, PODIUM_HEIGHT, PODIUM_DEPTH]} />
      </mesh>

      {/* Score display above podium */}
      <ScoreSprite score={score} position={[0, PODIUM_HEIGHT + 1.2, 0]} />

      {/* Name label on front */}
      <NameSprite name={name} position={[0, PODIUM_HEIGHT * 0.4, PODIUM_DEPTH / 2 + 0.2]} />

      {/* Crest: small colored square on front */}
      <mesh position={[0, PODIUM_HEIGHT * 0.75, PODIUM_DEPTH / 2 + 0.02]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Seat indicators: 4 small spheres on top edge */}
      {[0, 1, 2, 3].map(i => {
        const on = seat && seat.team === team && seat.idx === i;
        return (
          <mesh key={i} position={[-1.2 + i * 0.8, PODIUM_HEIGHT + 0.2, 0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial
              color={on ? '#c6f432' : '#333'}
              emissive={on ? '#c6f432' : '#000'}
              emissiveIntensity={on ? 0.5 : 0}
            />
          </mesh>
        );
      })}

      {/* Floating score chips */}
      {chips.map(c => (
        <ScoreChip key={c.id} delta={c.d} position={[0, PODIUM_HEIGHT + 1.8, 0]} />
      ))}
    </group>
  );
}
