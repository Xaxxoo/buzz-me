import type { CampusLayout } from './admin-api';

/* ── 3D campus types ── */

export interface CampusBuilding3D {
  key: string;
  name: string;
  /** center x in campus coordinates (0-100) */
  x: number;
  /** center y in campus coordinates (0-100) */
  y: number;
  /** width (x-axis extent) */
  w: number;
  /** depth (y-axis extent) */
  d: number;
  /** height (z-axis extent) */
  h: number;
  color: string;
  type: string;
}

export interface CampusTree3D {
  x: number;
  y: number;
}

export interface CampusPath3D {
  points: [number, number][];
}

export interface CampusLayout3D {
  bounds: { width: number; height: number };
  groundColor: string;
  accent: string;
  accentB: string;
  buildings: CampusBuilding3D[];
  trees: CampusTree3D[];
  paths: CampusPath3D[];
}

export interface CampusSceneProps {
  layout: CampusLayout3D;
  schoolColors?: { a: string; b: string };
  interactive?: boolean;
  selectedBuilding?: string | null;
  onBuildingClick?: (key: string) => void;
  onBuildingHover?: (key: string | null) => void;
  className?: string;
}

/* ── Height/depth defaults by building type ── */

const TYPE_DEFAULTS: Record<string, { d: number; h: number }> = {
  gate:        { d: 7,  h: 6 },
  library:     { d: 16, h: 18 },
  faculty:     { d: 14, h: 14 },
  hostel:      { d: 11, h: 12 },
  sports:      { d: 16, h: 4 },
  cafeteria:   { d: 9,  h: 8 },
  admin_block: { d: 10, h: 11 },
  lab:         { d: 10, h: 10 },
};

const FALLBACK = { d: 10, h: 10 };

/**
 * Convert a legacy 2D CampusLayout (from admin-api) to CampusLayout3D.
 * The 2D layout stores `width` and `height` per building but has no depth.
 * We infer depth/height from building-type defaults.
 */
export function normalizeCampusLayout(
  raw: CampusLayout,
  opts?: { accent?: string; accentB?: string; groundColor?: string },
): CampusLayout3D {
  const buildings: CampusBuilding3D[] = raw.buildings.map(b => {
    const defaults = TYPE_DEFAULTS[b.type] ?? FALLBACK;
    return {
      key: b.key,
      name: b.name,
      x: b.x,
      y: b.y,
      w: b.width,
      d: defaults.d,
      h: b.height > 0 ? b.height : defaults.h,
      color: b.color,
      type: b.type,
    };
  });

  return {
    bounds: raw.bounds,
    groundColor: opts?.groundColor ?? '#1a2e1a',
    accent: opts?.accent ?? '#0B8457',
    accentB: opts?.accentB ?? '#FFD23F',
    buildings,
    trees: [],
    paths: [],
  };
}
