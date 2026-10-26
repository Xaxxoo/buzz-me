'use client';

import type { AskView } from '@/lib/engine';
import { OptionPanel } from './OptionPanel';

interface OptionGroupProps {
  ask: AskView | null;
  visible: boolean;
  onAnswer: (text: string) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * 4 option panels arranged in a 2x2 grid in front of the camera.
 * Hidden when zone is not 'opts'.
 */
export function OptionGroup({ ask, visible, onAnswer }: OptionGroupProps) {
  if (!ask || !visible) return null;

  // 2x2 layout at z=7 — in front of podiums (z=2) so scores don't overlap
  const positions: [number, number, number][] = [
    [-2.4, 3.0, 7],   // A — top left
    [2.4, 3.0, 7],    // B — top right
    [-2.4, 1.4, 7],   // C — bottom left
    [2.4, 1.4, 7],    // D — bottom right
  ];

  return (
    <group>
      {ask.options.map((o, i) => (
        <group key={`${ask.key}-${i}`} position={positions[i]}>
          <OptionPanel
            option={o}
            letter={LETTERS[i]}
            index={i}
            onAnswer={onAnswer}
            entranceDelay={i * 0.08}
          />
        </group>
      ))}
    </group>
  );
}
