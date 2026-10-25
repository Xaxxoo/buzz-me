'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CampusBuilding3D } from '@/lib/campus-types';

/* ── Color helpers ── */

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

/* ── Per-face materials (6 sides of a BoxGeometry) ── */
// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
// In our setup: +X = right, -X = left, +Y = top, -Y = bottom, +Z = front, -Z = back

function buildMaterials(color: string, selected: boolean) {
  const emissiveIntensity = selected ? 0.15 : 0;
  const emissive = selected ? new THREE.Color(color) : new THREE.Color(0x000000);

  const right = new THREE.MeshStandardMaterial({ color: darken(color, 40), emissive, emissiveIntensity });
  const left = new THREE.MeshStandardMaterial({ color: darken(color, 65), emissive, emissiveIntensity });
  const top = new THREE.MeshStandardMaterial({ color: lighten(color, 20), emissive, emissiveIntensity });
  const bottom = new THREE.MeshStandardMaterial({ color: darken(color, 80) });
  const front = new THREE.MeshStandardMaterial({ color: darken(color, 40), emissive, emissiveIntensity });
  const back = new THREE.MeshStandardMaterial({ color: darken(color, 65), emissive, emissiveIntensity });

  return [right, left, top, bottom, front, back];
}

/* ── Window grid ── */

function WindowGrid({ w, h, d, type }: { w: number; h: number; d: number; type: string }) {
  if (h <= 5 || type === 'sports' || type === 'gate') return null;

  const windows: React.JSX.Element[] = [];
  const rows = Math.max(1, Math.floor(h / 5));
  const cols = Math.max(1, Math.floor(w / 5));
  const lCols = Math.max(1, Math.floor(d / 5));

  // Front face windows (+Z face, at z = d/2)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = -w / 2 + 2 + c * (w - 4) / cols + (w - 4) / cols * 0.3;
      const wy = -h / 2 + 2 + r * (h - 3) / rows + (h - 3) / rows * 0.25;
      const ww = (w - 4) / cols * 0.5;
      const wh = (h - 3) / rows * 0.5;
      windows.push(
        <mesh key={`f-${r}-${c}`} position={[wx + ww / 2, wy + wh / 2, d / 2 + 0.02]}>
          <planeGeometry args={[ww, wh]} />
          <meshBasicMaterial color="rgb(255,240,180)" transparent opacity={0.25} />
        </mesh>
      );
    }
  }

  // Left face windows (-X face, at x = -w/2)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < lCols; c++) {
      const wz = -d / 2 + 2 + c * (d - 4) / lCols + (d - 4) / lCols * 0.3;
      const wy = -h / 2 + 2 + r * (h - 3) / rows + (h - 3) / rows * 0.25;
      const ww = (d - 4) / lCols * 0.5;
      const wh = (h - 3) / rows * 0.5;
      windows.push(
        <mesh key={`l-${r}-${c}`} position={[-w / 2 - 0.02, wy + wh / 2, wz + ww / 2]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[ww, wh]} />
          <meshBasicMaterial color="rgb(255,240,180)" transparent opacity={0.15} />
        </mesh>
      );
    }
  }

  return <>{windows}</>;
}

/* ── Sports field markings ── */

function SportsMarkings({ w, d, h }: { w: number; d: number; h: number }) {
  const pts = useMemo(() => {
    const m = 1.5;
    const hw = w / 2 - m;
    const hd = d / 2 - m;
    const y = h / 2 + 0.05;

    // Outer border
    const border = [
      -hw, y, -hd,  hw, y, -hd,
      hw, y, -hd,   hw, y,  hd,
      hw, y,  hd,  -hw, y,  hd,
      -hw, y,  hd,  -hw, y, -hd,
      // Center line
      0, y, -hd,    0, y,  hd,
    ];
    return new Float32Array(border);
  }, [w, d, h]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, [pts]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
    </lineSegments>
  );
}

/* ── Gate arch decoration ── */

function GateArch({ w, h, color }: { w: number; h: number; color: string }) {
  const curve = useMemo(() => {
    const archH = 3;
    const halfW = w * 0.2;
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-halfW, h / 2, 0),
      new THREE.Vector3(0, h / 2 + archH, 0),
      new THREE.Vector3(halfW, h / 2, 0),
    );
  }, [w, h]);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 16, 0.3, 6, false), [curve]);

  return (
    <mesh geometry={tubeGeo} position={[0, 0, 0]}>
      <meshStandardMaterial color={lighten(color, 20)} transparent opacity={0.7} />
    </mesh>
  );
}

/* ── Main Building component ── */

interface BuildingProps {
  building: CampusBuilding3D;
  progress: MutableRefObject<number>;
  selected?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export function Building({ building: b, progress, selected = false, onClick, onPointerOver, onPointerOut }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const materials = useMemo(() => buildMaterials(b.color, selected), [b.color, selected]);

  useFrame(() => {
    const g = groupRef.current;
    const m = meshRef.current;
    if (!g || !m) return;
    const p = progress.current;
    const animH = b.h * p;
    // Update box geometry scale and position
    g.position.set(b.x, animH / 2, b.y);
    g.scale.set(1, p || 0.001, 1); // avoid 0 scale
  });

  return (
    <group ref={groupRef} position={[b.x, 0, b.y]}>
      {/* Main building box */}
      <mesh
        ref={meshRef}
        material={materials}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <boxGeometry args={[b.w, b.h, b.d]} />
      </mesh>

      {/* Windows */}
      <WindowGrid w={b.w} h={b.h} d={b.d} type={b.type} />

      {/* Sports field markings */}
      {b.type === 'sports' && <SportsMarkings w={b.w} d={b.d} h={b.h} />}

      {/* Gate arch */}
      {b.type === 'gate' && <GateArch w={b.w} h={b.h} color={b.color} />}

      {/* Shadow plane at ground level */}
      <mesh position={[0, -b.h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[b.w + 2, b.d + 2]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
