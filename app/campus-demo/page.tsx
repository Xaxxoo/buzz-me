'use client';

import { useState } from 'react';
import { CampusScene } from '@/components/campus/CampusScene';
import type { CampusLayout3D } from '@/lib/campus-types';

const UNILAG: CampusLayout3D = {
  bounds: { width: 100, height: 100 },
  groundColor: '#1a2e1a',
  accent: '#8E1B3A',
  accentB: '#F5C518',
  buildings: [
    { key: 'main_gate',     name: 'Main Gate',          x: 50, y: 95, w: 14, d: 7,  h: 6,  color: '#8E1B3A', type: 'gate' },
    { key: 'library',       name: 'University Library',  x: 40, y: 52, w: 20, d: 16, h: 18, color: '#F5C518', type: 'library' },
    { key: 'faculty_block', name: 'Faculty of Science',  x: 68, y: 42, w: 18, d: 14, h: 14, color: '#8E1B3A', type: 'faculty' },
    { key: 'hostel',        name: 'Moremi Hall',         x: 22, y: 28, w: 16, d: 11, h: 12, color: '#D4A373', type: 'hostel' },
    { key: 'sports_ground', name: 'Sports Centre',       x: 75, y: 72, w: 22, d: 16, h: 4,  color: '#2D6A4F', type: 'sports' },
    { key: 'cafeteria',     name: 'Indomie Joint',       x: 42, y: 76, w: 11, d: 9,  h: 8,  color: '#E76F51', type: 'cafeteria' },
    { key: 'admin',         name: 'Admin Block',         x: 52, y: 32, w: 14, d: 10, h: 11, color: '#6B4C3B', type: 'admin_block' },
    { key: 'lab',           name: 'Science Lab',         x: 18, y: 55, w: 12, d: 10, h: 10, color: '#4A6FA5', type: 'lab' },
  ],
  trees: [
    { x: 30, y: 40 }, { x: 35, y: 62 }, { x: 60, y: 60 }, { x: 80, y: 55 },
    { x: 15, y: 70 }, { x: 55, y: 80 }, { x: 85, y: 40 }, { x: 10, y: 42 },
    { x: 48, y: 38 }, { x: 72, y: 28 }, { x: 28, y: 85 }, { x: 62, y: 88 },
    { x: 90, y: 62 }, { x: 38, y: 22 }, { x: 75, y: 20 },
  ],
  paths: [
    { points: [[50,95],[50,76],[42,76]] },
    { points: [[50,76],[50,52],[40,52]] },
    { points: [[50,52],[68,42]] },
    { points: [[40,52],[22,28]] },
    { points: [[50,76],[75,72]] },
    { points: [[40,52],[18,55]] },
    { points: [[50,52],[52,32]] },
  ],
};

const UNN: CampusLayout3D = {
  bounds: { width: 100, height: 100 },
  groundColor: '#1a2e1a',
  accent: '#0B8457',
  accentB: '#FFD23F',
  buildings: [
    { key: 'main_gate',     name: 'Main Gate',              x: 50, y: 96, w: 14, d: 6,  h: 6,  color: '#0B8457', type: 'gate' },
    { key: 'library',       name: 'Nnamdi Azikiwe Library',  x: 45, y: 48, w: 22, d: 16, h: 20, color: '#FFD23F', type: 'library' },
    { key: 'faculty_block', name: 'Faculty of Engineering',  x: 72, y: 38, w: 18, d: 14, h: 15, color: '#0B8457', type: 'faculty' },
    { key: 'hostel',        name: 'Zik Flat',                x: 20, y: 24, w: 16, d: 12, h: 13, color: '#D4A373', type: 'hostel' },
    { key: 'sports_ground', name: 'UNN Stadium',             x: 62, y: 74, w: 24, d: 18, h: 4,  color: '#2D6A4F', type: 'sports' },
    { key: 'cafeteria',     name: 'Caf Block',               x: 32, y: 68, w: 12, d: 9,  h: 8,  color: '#E76F51', type: 'cafeteria' },
    { key: 'chapel',        name: 'University Chapel',       x: 25, y: 50, w: 10, d: 14, h: 16, color: '#7B68AE', type: 'admin_block' },
    { key: 'agric',         name: 'Agric Faculty',           x: 80, y: 58, w: 14, d: 10, h: 11, color: '#4A6FA5', type: 'faculty' },
  ],
  trees: [
    { x: 35, y: 35 }, { x: 58, y: 55 }, { x: 80, y: 48 }, { x: 12, y: 60 },
    { x: 42, y: 82 }, { x: 88, y: 70 }, { x: 16, y: 38 }, { x: 65, y: 30 },
    { x: 30, y: 78 }, { x: 78, y: 85 }, { x: 48, y: 28 }, { x: 90, y: 30 },
    { x: 55, y: 68 }, { x: 22, y: 90 }, { x: 70, y: 15 },
  ],
  paths: [
    { points: [[50,96],[50,74],[62,74]] },
    { points: [[50,74],[50,48],[45,48]] },
    { points: [[45,48],[25,50]] },
    { points: [[45,48],[20,24]] },
    { points: [[50,48],[72,38]] },
    { points: [[50,74],[32,68]] },
    { points: [[72,38],[80,58]] },
  ],
};

const ABU: CampusLayout3D = {
  bounds: { width: 100, height: 100 },
  groundColor: '#2a2518',
  accent: '#0B8457',
  accentB: '#FFD23F',
  buildings: [
    { key: 'main_gate',     name: 'Main Gate',              x: 50, y: 96, w: 16, d: 7,  h: 7,  color: '#0B8457', type: 'gate' },
    { key: 'library',       name: 'Kashim Ibrahim Library',  x: 48, y: 46, w: 22, d: 16, h: 20, color: '#FFD23F', type: 'library' },
    { key: 'faculty_block', name: 'Faculty of Medicine',     x: 74, y: 36, w: 18, d: 14, h: 16, color: '#0B8457', type: 'faculty' },
    { key: 'hostel',        name: 'Danfodiyo Hall',          x: 20, y: 26, w: 16, d: 12, h: 13, color: '#D4A373', type: 'hostel' },
    { key: 'sports_ground', name: 'ABU Stadium',             x: 66, y: 72, w: 24, d: 18, h: 4,  color: '#2D6A4F', type: 'sports' },
    { key: 'cafeteria',     name: 'SUG Cafeteria',           x: 35, y: 72, w: 12, d: 9,  h: 8,  color: '#E76F51', type: 'cafeteria' },
    { key: 'mosque',        name: 'Central Mosque',          x: 28, y: 48, w: 12, d: 12, h: 18, color: '#3A7CA5', type: 'admin_block' },
    { key: 'vet',           name: 'Vet Faculty',             x: 82, y: 56, w: 13, d: 10, h: 11, color: '#8B5E3C', type: 'faculty' },
  ],
  trees: [
    { x: 38, y: 32 }, { x: 60, y: 58 }, { x: 15, y: 55 }, { x: 42, y: 85 },
    { x: 88, y: 44 }, { x: 12, y: 72 }, { x: 72, y: 22 }, { x: 55, y: 38 },
    { x: 30, y: 62 }, { x: 78, y: 80 }, { x: 45, y: 18 }, { x: 92, y: 68 },
    { x: 18, y: 88 }, { x: 65, y: 65 }, { x: 82, y: 28 },
  ],
  paths: [
    { points: [[50,96],[50,72],[66,72]] },
    { points: [[50,72],[35,72]] },
    { points: [[50,72],[50,46],[48,46]] },
    { points: [[48,46],[28,48]] },
    { points: [[48,46],[20,26]] },
    { points: [[50,46],[74,36]] },
    { points: [[74,36],[82,56]] },
  ],
};

const CAMPUSES = [
  { label: 'UNILAG', layout: UNILAG },
  { label: 'UNN Nsukka', layout: UNN },
  { label: 'ABU Zaria', layout: ABU },
];

export default function CampusDemoPage() {
  const [idx, setIdx] = useState(0);
  const [interactive, setInteractive] = useState(false);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'var(--font-body, system-ui)' }}>
      <h1 style={{ font: '800 28px/1.1 var(--font-display, system-ui)', color: '#c6f432', marginBottom: 8 }}>
        Campus 3D Demo
      </h1>
      <p style={{ color: '#8a847b', fontSize: 14, marginBottom: 24 }}>
        Three.js isometric campus renderer — same data as the Canvas2D prototype.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {CAMPUSES.map((c, i) => (
          <button
            key={c.label}
            onClick={() => setIdx(i)}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              border: i === idx ? '1px solid rgba(198,244,50,0.2)' : '1px solid rgba(255,255,255,0.06)',
              background: i === idx ? 'rgba(198,244,50,0.08)' : 'transparent',
              color: i === idx ? '#c6f432' : '#8a847b',
              font: '600 13px var(--font-body, system-ui)',
              cursor: 'pointer',
            }}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={() => setInteractive(!interactive)}
          style={{
            marginLeft: 'auto',
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
            background: interactive ? 'rgba(198,244,50,0.08)' : 'transparent',
            color: interactive ? '#c6f432' : '#8a847b',
            font: '600 13px var(--font-body, system-ui)',
            cursor: 'pointer',
          }}
        >
          {interactive ? 'Orbit: ON' : 'Orbit: OFF'}
        </button>
      </div>

      <CampusScene
        key={idx}
        layout={CAMPUSES[idx].layout}
        interactive={interactive}
      />
    </div>
  );
}
