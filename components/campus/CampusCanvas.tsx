'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useCallback, useState } from 'react';
import type { CampusSceneProps } from '@/lib/campus-types';
import { useEntranceAnimation } from './hooks/useEntranceAnimation';
import { Ground } from './meshes/Ground';
import { Tree } from './meshes/Tree';
import { CampusPath } from './meshes/CampusPath';
import { Building } from './meshes/Building';
import { BuildingLabel } from './meshes/BuildingLabel';

/* ── Inner scene that runs inside the Canvas context ── */

function Scene({ layout, interactive, selectedBuilding, onBuildingClick, onBuildingHover }: CampusSceneProps) {
  const progress = useEntranceAnimation();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const handleHover = useCallback((key: string | null) => {
    setHoveredKey(key);
    onBuildingHover?.(key);
  }, [onBuildingHover]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[60, 80, 40]} intensity={0.8} />

      {/* Scene group, offset to center the 0-100 campus coordinate space */}
      <group position={[-50, 0, -50]}>
        <Ground groundColor={layout.groundColor} />

        {/* Paths */}
        {layout.paths.map((path, i) => (
          <CampusPath key={i} points={path.points} />
        ))}

        {/* Buildings */}
        {layout.buildings.map(b => (
          <Building
            key={b.key}
            building={b}
            progress={progress}
            selected={hoveredKey === b.key || selectedBuilding === b.key}
            onClick={onBuildingClick ? () => onBuildingClick(b.key) : undefined}
            onPointerOver={() => handleHover(b.key)}
            onPointerOut={() => handleHover(null)}
          />
        ))}

        {/* Building labels */}
        {layout.buildings.map(b => (
          <BuildingLabel key={`label-${b.key}`} building={b} progress={progress} />
        ))}

        {/* Trees */}
        {layout.trees.map((t, i) => (
          <Tree key={i} x={t.x} y={t.y} progress={progress} />
        ))}
      </group>
    </>
  );
}

/* ── Exported CampusCanvas (dynamically imported by CampusScene) ── */

export default function CampusCanvas(props: CampusSceneProps) {
  return (
    <Canvas
      orthographic
      camera={{
        position: [70, 70, 70],
        zoom: 4,
        near: 0.1,
        far: 1000,
      }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene {...props} />
      {props.interactive && (
        <OrbitControls
          enableZoom={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 3}
          minAzimuthAngle={-Math.PI / 6}
          maxAzimuthAngle={Math.PI / 6}
        />
      )}
    </Canvas>
  );
}
