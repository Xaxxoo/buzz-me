import * as THREE from 'three';

/* ── Color helpers (extracted from campus Building.tsx pattern) ── */

export function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

export function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

/* ── Reusable material factories ── */

/** Dark semi-transparent glass panel (for question board, option panels) */
export function glassMaterial(color = '#111110'): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    roughness: 0.1,
    metalness: 0.2,
    clearcoat: 0.3,
  });
}

/**
 * Per-face materials for a BoxGeometry podium.
 * Face order: +X, -X, +Y, -Y, +Z, -Z
 */
export function podiumMaterials(color: string): THREE.MeshStandardMaterial[] {
  return [
    new THREE.MeshStandardMaterial({ color: darken(color, 40) }),  // right
    new THREE.MeshStandardMaterial({ color: darken(color, 65) }),  // left
    new THREE.MeshStandardMaterial({ color: lighten(color, 20) }), // top
    new THREE.MeshStandardMaterial({ color: darken(color, 80) }),  // bottom
    new THREE.MeshStandardMaterial({ color: darken(color, 40) }),  // front
    new THREE.MeshStandardMaterial({ color: darken(color, 65) }),  // back
  ];
}

/** Emissive highlight material (for bonus glow, active indicators) */
export function glowMaterial(color: string, intensity = 0.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    transparent: true,
    opacity: 0.9,
  });
}
