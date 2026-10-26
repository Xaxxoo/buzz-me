'use client';

import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QUESTION_BOARD_POS, BOARD_WIDTH, BOARD_HEIGHT } from '../shared/constants';
import { useCanvasTexture } from '../hooks/useCanvasTexture';
import type { WordView } from '@/lib/engine';

interface QuestionBoardProps {
  tag: string;
  words: WordView[];
  visibleCount: number;
  answer: string | null;
  bonusCard: boolean;
  progress: MutableRefObject<number>;
}

export function QuestionBoard({ tag, words, visibleCount, answer, bonusCard, progress }: QuestionBoardProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Build the visible text string — words don't include trailing spaces
  const visibleText = words
    .slice(0, visibleCount)
    .map(w => w.text)
    .join(' ');

  // Question text texture
  const { texture: qTex, aspect: qAspect } = useCanvasTexture((ctx, canvas) => {
    const w = 800;
    const h = 300;
    if (canvas.width > 0) {
      // Background
      ctx.fillStyle = bonusCard ? 'rgba(198,244,50,0.08)' : 'rgba(10,10,9,0.92)';
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 16);
      ctx.fill();

      // Bonus border glow
      if (bonusCard) {
        ctx.strokeStyle = 'rgba(198,244,50,0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(2, 2, w - 4, h - 4, 14);
        ctx.stroke();
      }

      // Category tag
      ctx.font = '500 18px Inter Tight, system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText(tag, w / 2, 32);

      // Question text with word wrap
      ctx.font = '600 26px Inter Tight, system-ui, sans-serif';
      ctx.fillStyle = '#f0ebe3';
      ctx.textAlign = 'center';

      const maxWidth = w - 60;
      const lineHeight = 34;
      const wordsArr = visibleText.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of wordsArr) {
        const test = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);

      const startY = 80;
      const maxLines = Math.min(lines.length, 5);
      for (let i = 0; i < maxLines; i++) {
        ctx.fillText(lines[i], w / 2, startY + i * lineHeight);
      }

      // Answer text
      if (answer) {
        const ansY = startY + maxLines * lineHeight + 20;
        ctx.font = '500 22px Inter Tight, system-ui, sans-serif';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('Answer: ' + answer, w / 2, ansY);
      }
    }
    return { w, h };
  }, [tag, visibleText, answer, bonusCard]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    // Phase 2: 0.4 → 0.7 — slides down from above
    if (progress.current < 0.4) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const p = Math.min((progress.current - 0.4) / 0.3, 1);
    const yOff = (1 - p) * 4; // slides down 4 units
    g.position.set(QUESTION_BOARD_POS[0], QUESTION_BOARD_POS[1] + yOff, QUESTION_BOARD_POS[2]);
  });

  const boardH = BOARD_HEIGHT;
  const boardW = boardH * qAspect;

  return (
    <group ref={groupRef} position={QUESTION_BOARD_POS} visible={false}>
      {/* Board background panel */}
      <mesh>
        <planeGeometry args={[BOARD_WIDTH, BOARD_HEIGHT]} />
        <meshPhysicalMaterial color="#111110" transparent opacity={0.85} roughness={0.1} metalness={0.2} clearcoat={0.3} />
      </mesh>

      {/* Question texture overlay */}
      <sprite position={[0, 0, 0.05]} scale={[boardW, boardH, 1]}>
        <spriteMaterial map={qTex} transparent depthTest={false} />
      </sprite>
    </group>
  );
}
