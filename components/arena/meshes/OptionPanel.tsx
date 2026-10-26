'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MARK_COLORS, OPTION_PANEL_W, OPTION_PANEL_H } from '../shared/constants';
import { useCanvasTexture } from '../hooks/useCanvasTexture';
import type { OptionView } from '@/lib/engine';

interface OptionPanelProps {
  option: OptionView;
  letter: string;
  index: number;
  onAnswer: (text: string) => void;
  entranceDelay: number;
}

export function OptionPanel({ option, letter, index, onAnswer, entranceDelay }: OptionPanelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const entered = useRef(false);

  const mark = option.mark || 'default';
  const bg = MARK_COLORS[mark as keyof typeof MARK_COLORS] ?? MARK_COLORS.default;
  const textColor = mark === 'right' ? '#ffffff' : mark === 'wrong' ? '#ffffff' : '#f0ebe3';

  const { texture, aspect } = useCanvasTexture((ctx, canvas) => {
    const w = 400;
    const h = 120;
    if (canvas.width > 0) {
      // Background
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 14);
      ctx.fill();

      // Letter key
      ctx.font = '700 32px Inter Tight, system-ui, sans-serif';
      ctx.fillStyle = mark === 'default' ? '#9ca3af' : textColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 20, h / 2);

      // Option text
      ctx.font = '600 24px Inter Tight, system-ui, sans-serif';
      ctx.fillStyle = textColor;
      const maxW = w - 80;
      let text = option.text;
      if (ctx.measureText(text).width > maxW) {
        while (ctx.measureText(text + '...').width > maxW && text.length > 0) text = text.slice(0, -1);
        text += '...';
      }
      ctx.fillText(text, 60, h / 2);
    }
    return { w, h };
  }, [option.text, mark, bg, textColor, letter]);

  useFrame((_, delta) => {
    const m = meshRef.current;
    if (!m) return;

    elapsed.current += delta;
    if (!entered.current) {
      // Stagger entrance from right
      const entranceTime = elapsed.current - entranceDelay;
      if (entranceTime < 0) {
        m.position.x = 3; // offscreen right
        (m.material as THREE.SpriteMaterial).opacity = 0;
        return;
      }
      const t = Math.min(entranceTime / 0.3, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      m.position.x = 3 * (1 - ease);
      (m.material as THREE.SpriteMaterial).opacity = ease;
      if (t >= 1) entered.current = true;
    }
  });

  const panelH = OPTION_PANEL_H;
  const panelW = panelH * aspect;

  return (
    <sprite
      ref={meshRef as any}
      scale={[panelW, panelH, 1]}
      onClick={(e) => {
        e.stopPropagation();
        if (!option.disabled) onAnswer(option.text);
      }}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={0}
        depthTest={false}
      />
    </sprite>
  );
}
