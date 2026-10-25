'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { checkCapabilities } from '@/lib/capabilities';
import type { CampusSceneProps } from '@/lib/campus-types';

const CampusCanvas = lazy(() => import('./CampusCanvas'));

function Shimmer() {
  return (
    <div className="campus-scene-shimmer">
      <div className="campus-scene-shimmer-bar" />
    </div>
  );
}

export function CampusScene(props: CampusSceneProps) {
  const [capable, setCapable] = useState<boolean | null>(null);

  useEffect(() => {
    const caps = checkCapabilities();
    setCapable(caps.canRender3D);
  }, []);

  // Still checking capabilities
  if (capable === null) return <div className={`campus-scene-wrap ${props.className ?? ''}`}><Shimmer /></div>;

  // Low-end device: show nothing (a fallback image could be added here)
  if (!capable) return null;

  return (
    <div className={`campus-scene-wrap ${props.className ?? ''}`}>
      <Suspense fallback={<Shimmer />}>
        <CampusCanvas {...props} />
      </Suspense>
    </div>
  );
}
