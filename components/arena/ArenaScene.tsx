'use client';

import { useRef, memo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { GameState } from '@/lib/engine';
import type { Team } from '@/lib/types';
import { PODIUM_YOU_POS, PODIUM_RIVAL_POS, CAMERA_TARGET } from './shared/constants';
import { useArenaEntrance } from './hooks/useArenaEntrance';
import { useCameraShake } from './hooks/useCameraShake';
import { ArenaFloor } from './meshes/ArenaFloor';
import { Podium } from './meshes/Podium';
import { BuzzerDome } from './meshes/BuzzerDome';
import { QuestionBoard } from './meshes/QuestionBoard';
import { OptionGroup } from './meshes/OptionGroup';
import { StampBurst } from './meshes/StampBurst';
import { RivalBubble } from './meshes/RivalBubble';
import { PipTrack } from './meshes/PipTrack';
import { TimerRing } from './meshes/TimerRing';
import { SeatRow } from './meshes/SeatRow';

interface ArenaSceneProps {
  s: GameState;
  onBuzz: () => void;
  onAnswer: (text: string) => void;
}

/**
 * Root scene orchestrator.
 *
 * Key design: components are always mounted and use visibility toggles instead
 * of conditional mount/unmount. This avoids re-creating textures, geometries,
 * and materials on every zone change which causes GPU memory churn and crashes.
 */
export const ArenaScene = memo(function ArenaScene({ s, onBuzz, onAnswer }: ArenaSceneProps) {
  const progress = useArenaEntrance();
  const shakeOffset = useCameraShake(s.flash?.key ?? 0);
  const { camera } = useThree();
  const baseCamPos = useRef(camera.position.clone());

  // Apply camera shake
  useFrame(() => {
    const [ox, oy] = shakeOffset.current;
    camera.position.set(
      baseCamPos.current.x + ox,
      baseCamPos.current.y + oy,
      baseCamPos.current.z,
    );
    camera.lookAt(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2]);
  });

  const teamColor = (t: Team) => (t === 'you' ? s.you?.a : s.rival?.a) ?? '#1B1464';
  const accentColor = s.you?.a ?? '#0B8457';
  const showBuzzer = !s.spectating && s.zone === 'buzz';
  const showOpts = !s.spectating && s.zone === 'opts';
  const showRival = s.zone === 'rival';

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 15]} intensity={0.8} />

      {/* Arena floor */}
      <ArenaFloor accentColor={accentColor} progress={progress} />

      {/* Seat rows (atmosphere) */}
      <SeatRow progress={progress} />

      {/* Your podium */}
      {s.you && (
        <Podium
          position={PODIUM_YOU_POS}
          color={s.you.a}
          name={s.you.short}
          score={s.scoreYou}
          seat={s.seat}
          team="you"
          progress={progress}
        />
      )}

      {/* Rival podium */}
      {s.rival && (
        <Podium
          position={PODIUM_RIVAL_POS}
          color={s.rival.a}
          name={s.rival.short}
          score={s.scoreRival}
          seat={s.seat}
          team="rival"
          progress={progress}
        />
      )}

      {/* Buzzer dome — stays mounted, visibility controlled via prop */}
      <BuzzerDome buzzLive={s.buzzLive} onBuzz={onBuzz} progress={progress} visible={showBuzzer} />

      {/* Buzzer window timer */}
      <TimerRing secs={showBuzzer ? s.window.secs : 0} timerKey={s.window.key} />

      {/* Question board */}
      <QuestionBoard
        tag={s.tag}
        words={s.words}
        visibleCount={s.visibleCount}
        answer={s.answer}
        bonusCard={s.bonusCard}
        progress={progress}
      />

      {/* Answer options — stays mounted, visibility controlled via prop */}
      <OptionGroup ask={s.ask} visible={showOpts} onAnswer={onAnswer} />

      {/* Answer timer ring */}
      <TimerRing
        secs={showOpts && s.ask ? s.ask.secs : 0}
        timerKey={s.ask?.key ?? 0}
        position={[0, 5, 2]}
        radius={1.5}
      />

      {/* Stamp burst */}
      <StampBurst stamp={s.stamp} teamColor={teamColor(s.stamp?.team ?? 'you')} />

      {/* Rival bubble — stays mounted, visibility controlled via prop */}
      <RivalBubble rivalView={s.rivalView} visible={showRival} />

      {/* Progress pips */}
      <PipTrack total={s.total} took={s.took} qi={s.qi} progress={progress} />
    </>
  );
});
