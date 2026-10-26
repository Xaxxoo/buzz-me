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

  // 2x2 layout centered at [0, 2.5, 2]
  const positions: [number, number, number][] = [
    [-2.8, 3.2, 2],   // A — top left
    [2.8, 3.2, 2],    // B — top right
    [-2.8, 1.6, 2],   // C — bottom left
    [2.8, 1.6, 2],    // D — bottom right
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
