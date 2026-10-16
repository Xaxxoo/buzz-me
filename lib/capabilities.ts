export interface DeviceCapabilities {
  canRender3D: boolean;
  reason: 'ok' | 'low-memory' | 'slow-network' | 'reduced-motion' | 'no-webgl';
}

export function checkCapabilities(): DeviceCapabilities {
  try {
    // Check device memory (Chrome/Edge only)
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      if ((navigator as any).deviceMemory < 4) {
        return { canRender3D: false, reason: 'low-memory' };
      }
    }

    // Check network speed
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
        return { canRender3D: false, reason: 'slow-network' };
      }
    }

    // Check reduced motion preference
    if (typeof matchMedia !== 'undefined') {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return { canRender3D: false, reason: 'reduced-motion' };
      }
    }

    // Check WebGL availability
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        return { canRender3D: false, reason: 'no-webgl' };
      }
    }

    return { canRender3D: true, reason: 'ok' };
  } catch {
    return { canRender3D: false, reason: 'no-webgl' };
  }
}
