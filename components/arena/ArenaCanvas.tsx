'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CAMERA_FOV, CAMERA_POS, CAMERA_TARGET } from './shared/constants';
import { ArenaScene } from './ArenaScene';
import type { GameState } from '@/lib/engine';

interface ArenaCanvasProps {
  active: boolean;
  s: GameState;
  boardKey: string;
  onBuzz: () => void;
  onAnswer: (text: string) => void;
  onAcceptBot?: () => void;
  onDismissBot?: () => void;
  onCancelFind?: () => void;
  onJoinPrivate?: (code: string) => void;
  onCancelPrivate?: () => void;
}

function PrivateMatchPanel({ code, onJoin, onCancel }: { code: string | null; onJoin?: (code: string) => void; onCancel?: () => void }) {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="private-panel flex flex-col items-center gap-3">
      {code && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm">Your room code:</span>
          <span className="private-code">{code}</span>
          <button className="btn small" type="button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm">Or join someone else&apos;s room:</span>
        <div className="flex gap-2">
          <input className="code-input" type="text" maxLength={6} placeholder="Enter code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
          <button className="btn small" type="button" disabled={joinCode.length < 4} onClick={() => onJoin?.(joinCode)}>Join</button>
        </div>
      </div>
      <button className="btn ghost small" type="button" onClick={onCancel}>Cancel</button>
    </div>
  );
}

export default function ArenaCanvas(props: ArenaCanvasProps) {
  const { active, s, onBuzz, onAnswer, onAcceptBot, onDismissBot, onCancelFind, onJoinPrivate, onCancelPrivate } = props;

  return (
    <section className="screen match enter flex-auto min-h-0 flex flex-col" id="s-match" hidden={!active}>
      {/* R3F Canvas — takes full space */}
      <div className="arena-canvas-wrap">
        <Canvas
          camera={{
            fov: CAMERA_FOV,
            position: CAMERA_POS,
            near: 0.1,
            far: 200,
          }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ camera }) => {
            camera.lookAt(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2]);
          }}
        >
          <ArenaScene s={s} onBuzz={onBuzz} onAnswer={onAnswer} />
        </Canvas>
      </div>

      {/* HTML overlay for UI that needs form elements */}
      <div className="arena-overlay">
        {s.finding && !s.botOffer && (
          <div className="arena-overlay-panel">
            <div className="finding-spinner" />
            <p className="status">{s.status}</p>
            <button className="btn ghost small" type="button" onClick={onCancelFind}>Cancel</button>
          </div>
        )}

        {s.finding && s.botOffer && (
          <div className="arena-overlay-panel bot-offer flex flex-col items-center gap-3">
            <p className="status">{s.status}</p>
            <div className="flex gap-2">
              <button className="btn" type="button" onClick={onAcceptBot}>Play Bot</button>
              <button className="btn ghost" type="button" onClick={onDismissBot}>Keep Waiting</button>
            </div>
            <button className="btn ghost small" type="button" onClick={onCancelFind}>Cancel</button>
          </div>
        )}

        {s.privateWaiting && (
          <div className="arena-overlay-panel">
            <PrivateMatchPanel code={s.privateCode} onJoin={onJoinPrivate} onCancel={onCancelPrivate} />
          </div>
        )}

        {s.spectating && (
          <div className="arena-overlay-badge">
            <span className="spectating-badge">Spectating</span>
          </div>
        )}
      </div>
    </section>
  );
}
