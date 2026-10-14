'use client';

import { useState } from 'react';
import type { ChallengeData, ChallengeLobbyState } from '@/lib/types';

interface Props {
  active: boolean;
  challengeView: 'board' | 'create' | 'detail' | 'lobby';
  challenges: ChallengeData[];
  activeChallenge: ChallengeData | null;
  challengeLobby: ChallengeLobbyState | null;
  userId: string | null;
  onMenu: () => void;
  onShowCreate: () => void;
  onBackToBoard: () => void;
  onSelectChallenge: (c: ChallengeData) => void;
  onCreateChallenge: (dto: { categories: string[]; question_count: number; team_size: number; start_at: string | null }) => void;
  onAcceptChallenge: (id: string) => void;
  onJoinLobby: (id: string) => void;
  onLeaveLobby: (id: string) => void;
  onCancelChallenge: (id: string) => void;
  onReady: (id: string, ready: boolean) => void;
  onStart: (id: string) => void;
}

function Board({ challenges, onShowCreate, onSelect }: { challenges: ChallengeData[]; onShowCreate: () => void; onSelect: (c: ChallengeData) => void }) {
  const open = challenges.filter(c => c.status === 'open' || c.status === 'accepted');
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 style={{ margin: 0, font: '900 16px/1 var(--font-display)' }}>Open Challenges</h3>
        <button className="btn" type="button" onClick={onShowCreate}>Create</button>
      </div>
      {open.length === 0 && <p style={{ font: '600 14px/1.3 var(--font-body)', opacity: 0.6 }}>No open challenges. Create one to get started.</p>}
      <div className="flex flex-col gap-2">
        {open.map(c => (
          <button key={c.id} className="challenge-card" type="button" onClick={() => onSelect(c)}>
            <b>{c.host_university?.short_name ?? 'Unknown'} {c.guest_university ? `vs ${c.guest_university.short_name}` : 'vs ?'}</b>
            <span>{c.question_count} questions, team of {c.team_size}</span>
            <div className="challenge-meta">
              <em>{c.status}</em>
              {c.start_at && <em>{new Date(c.start_at).toLocaleDateString()}</em>}
              {c.categories.length > 0 && c.categories.map(cat => <em key={cat}>{cat}</em>)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateForm({ onSubmit, onBack }: { onSubmit: (dto: { categories: string[]; question_count: number; team_size: number; start_at: string | null }) => void; onBack: () => void }) {
  const [qCount, setQCount] = useState(20);
  const [teamSize, setTeamSize] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="head flex items-center gap-3">
        <button className="back" type="button" onClick={onBack}>Back</button>
        <h2>Create Challenge</h2>
      </div>
      <div className="flex flex-col gap-3" style={{ padding: '16px', background: 'var(--color-paper)', border: '3px solid var(--color-ink)', borderRadius: '16px' }}>
        <label style={{ font: '700 13px/1 var(--font-display)' }}>
          Questions: {qCount}
          <input type="range" min={8} max={40} step={2} value={qCount} onChange={e => setQCount(Number(e.target.value))} style={{ width: '100%' }} />
        </label>
        <label style={{ font: '700 13px/1 var(--font-display)' }}>
          Team size: {teamSize}
          <input type="range" min={1} max={3} value={teamSize} onChange={e => setTeamSize(Number(e.target.value))} style={{ width: '100%' }} />
        </label>
        <button className="btn" type="button" onClick={() => onSubmit({ categories: [], question_count: qCount, team_size: teamSize, start_at: null })}>Create Challenge</button>
      </div>
    </div>
  );
}

function Detail({ challenge, userId, onBack, onAccept, onJoinLobby, onCancel }: {
  challenge: ChallengeData;
  userId: string | null;
  onBack: () => void;
  onAccept: (id: string) => void;
  onJoinLobby: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const isCreator = challenge.created_by === userId;
  const canAccept = challenge.status === 'open' && !isCreator;
  const canJoin = challenge.status === 'accepted';
  const canCancel = isCreator && (challenge.status === 'open' || challenge.status === 'accepted');

  return (
    <div className="flex flex-col gap-3">
      <div className="head flex items-center gap-3">
        <button className="back" type="button" onClick={onBack}>Back</button>
        <h2>Challenge</h2>
      </div>
      <div className="challenge-detail">
        <h3>{challenge.host_university?.name ?? 'Unknown'} {challenge.guest_university ? `vs ${challenge.guest_university.name}` : 'vs ?'}</h3>
        <div style={{ font: '600 14px/1.3 var(--font-body)' }}>
          <p style={{ margin: '4px 0' }}>{challenge.question_count} questions, team of {challenge.team_size}</p>
          <p style={{ margin: '4px 0' }}>Status: {challenge.status}</p>
          <p style={{ margin: '4px 0' }}>Share code: <b>{challenge.share_code}</b></p>
          {challenge.start_at && <p style={{ margin: '4px 0' }}>Starts: {new Date(challenge.start_at).toLocaleString()}</p>}
        </div>
        <div className="flex gap-2">
          {canAccept && <button className="btn" type="button" onClick={() => onAccept(challenge.id)}>Accept Challenge</button>}
          {canJoin && <button className="btn" type="button" onClick={() => onJoinLobby(challenge.id)}>Join Lobby</button>}
          {canCancel && <button className="btn ghost" type="button" onClick={() => onCancel(challenge.id)}>Cancel</button>}
        </div>
      </div>
    </div>
  );
}

function Lobby({ challenge, lobby, userId, onLeave, onReady, onStart }: {
  challenge: ChallengeData;
  lobby: ChallengeLobbyState | null;
  userId: string | null;
  onLeave: (id: string) => void;
  onReady: (id: string, ready: boolean) => void;
  onStart: (id: string) => void;
}) {
  const myPlayer = lobby ? [...lobby.hostPlayers, ...lobby.guestPlayers].find(p => p.userId === userId) : null;
  const amReady = myPlayer?.ready ?? false;
  const allReady = lobby?.hostReady && lobby?.guestReady;

  return (
    <div className="flex flex-col gap-3">
      <div className="head flex items-center gap-3">
        <button className="back" type="button" onClick={() => onLeave(challenge.id)}>Leave</button>
        <h2>Challenge Lobby</h2>
      </div>
      <div className="invite-code" onClick={() => navigator.clipboard?.writeText(challenge.share_code)}>
        <span className="copy-hint">Share code (tap to copy)</span>
        <span className="code">{challenge.share_code}</span>
      </div>
      <div className="flex gap-3">
        <div className="challenge-lobby-side">
          <h4>{lobby?.hostUniName ?? challenge.host_university?.short_name ?? 'Host'}</h4>
          {lobby?.hostPlayers.map(p => (
            <div key={p.userId} className="lobby-member">
              <i className={'ready-dot' + (p.ready ? ' on' : '')} />
              <span style={{ flex: 1, font: '600 14px/1.2 var(--font-body)' }}>{p.username}</span>
              <span style={{ font: '700 12px/1 var(--font-display)' }}>{p.rating}</span>
            </div>
          ))}
        </div>
        <div className="challenge-lobby-side">
          <h4>{lobby?.guestUniName ?? challenge.guest_university?.short_name ?? 'Guest'}</h4>
          {lobby?.guestPlayers.map(p => (
            <div key={p.userId} className="lobby-member">
              <i className={'ready-dot' + (p.ready ? ' on' : '')} />
              <span style={{ flex: 1, font: '600 14px/1.2 var(--font-body)' }}>{p.username}</span>
              <span style={{ font: '700 12px/1 var(--font-display)' }}>{p.rating}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button className={'btn' + (amReady ? ' ghost' : '')} type="button" onClick={() => onReady(challenge.id, !amReady)}>
          {amReady ? 'Not Ready' : 'Ready'}
        </button>
        {allReady && <button className="btn" type="button" onClick={() => onStart(challenge.id)}>Start Match</button>}
      </div>
    </div>
  );
}

export function Challenge({
  active, challengeView, challenges, activeChallenge, challengeLobby, userId,
  onMenu, onShowCreate, onBackToBoard, onSelectChallenge, onCreateChallenge, onAcceptChallenge,
  onJoinLobby, onLeaveLobby, onCancelChallenge, onReady, onStart,
}: Props) {
  return (
    <section className="screen enter flex-auto min-h-0 flex flex-col gap-3 overflow-y-auto" id="s-challenges" hidden={!active}>
      {challengeView === 'board' && (
        <>
          <div className="head flex items-center gap-3">
            <button className="back" type="button" onClick={onMenu}>Menu</button>
            <h2>Challenges</h2>
          </div>
          <Board challenges={challenges} onShowCreate={onShowCreate} onSelect={onSelectChallenge} />
        </>
      )}
      {challengeView === 'create' && (
        <CreateForm onSubmit={onCreateChallenge} onBack={onBackToBoard} />
      )}
      {challengeView === 'detail' && activeChallenge && (
        <Detail
          challenge={activeChallenge}
          userId={userId}
          onBack={onBackToBoard}
          onAccept={onAcceptChallenge}
          onJoinLobby={onJoinLobby}
          onCancel={onCancelChallenge}
        />
      )}
      {challengeView === 'lobby' && activeChallenge && (
        <Lobby
          challenge={activeChallenge}
          lobby={challengeLobby}
          userId={userId}
          onLeave={onLeaveLobby}
          onReady={onReady}
          onStart={onStart}
        />
      )}
    </section>
  );
}
