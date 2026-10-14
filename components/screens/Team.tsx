'use client';

import { useState } from 'react';
import type { TeamData, LobbyState } from '@/lib/types';
import { num } from '@/lib/engine';

interface Props {
  active: boolean;
  myTeams: TeamData[];
  teamView: 'list' | 'create' | 'lobby';
  activeTeam: TeamData | null;
  lobby: LobbyState | null;
  teamFinding: boolean;
  userId: string | null;
  onMenu: () => void;
  onCreateTeam: (name: string) => void;
  onJoinByCode: (code: string) => void;
  onSelectTeam: (team: TeamData) => void;
  onShowCreate: () => void;
  onBackToList: () => void;
  onJoinLobby: (teamId: string) => void;
  onLeaveLobby: (teamId: string) => void;
  onReady: (teamId: string, ready: boolean) => void;
  onStartFind: (teamId: string) => void;
  onCancelFind: (teamId: string) => void;
  onChallenge: (teamId: string, code: string) => void;
  onRegenerateCode: (teamId: string) => void;
  onTransferCaptain: (teamId: string, userId: string) => void;
  onRemoveMember: (teamId: string, userId: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function Team({
  active, myTeams, teamView, activeTeam, lobby, teamFinding, userId,
  onMenu, onCreateTeam, onJoinByCode, onSelectTeam, onShowCreate, onBackToList,
  onJoinLobby, onLeaveLobby, onReady, onStartFind, onCancelFind, onChallenge,
  onRegenerateCode, onTransferCaptain, onRemoveMember,
  loading, error, onRetry,
}: Props) {
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [challengeCode, setChallengeCode] = useState('');
  const [copied, setCopied] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const myReady = lobby?.members.find(m => m.userId === userId)?.ready ?? false;
  const isCaptain = lobby?.members.find(m => m.userId === userId)?.isCaptain ?? false;
  const allReady = lobby ? lobby.members.length >= 2 && lobby.members.every(m => m.ready) : false;

  return (
    <section className="screen enter flex-auto min-h-0 flex flex-col gap-3" id="s-team" hidden={!active}>
      <div className="head flex items-center gap-3">
        <button className="back" type="button" onClick={teamView === 'list' ? onMenu : onBackToList}>Back</button>
        <h2>{teamView === 'create' ? 'Create Team' : teamView === 'lobby' ? (activeTeam?.name ?? 'Lobby') : 'My Teams'}</h2>
      </div>

      {/* ── List view ── */}
      {teamView === 'list' && (
        <div className="flex flex-col gap-3 flex-auto min-h-0 overflow-y-auto">
          {error && (
            <div className="flex flex-col items-center gap-2 py-4">
              <p style={{ font: '600 14px/1.3 var(--font-body)', color: 'var(--color-buzz)' }}>{error}</p>
              {onRetry && <button className="btn ghost small" type="button" onClick={onRetry}>Retry</button>}
            </div>
          )}
          {!error && loading && myTeams.length === 0 && (
            <p className="pick-note">Loading&hellip;</p>
          )}
          {!error && !loading && myTeams.length === 0 && (
            <p className="pick-note">You haven&apos;t joined any teams yet. Create one or join by code.</p>
          )}
          {myTeams.map(team => (
            <button key={team.id} className="team-card" type="button" onClick={() => onSelectTeam(team)}>
              <div className="flex-1 min-w-0">
                <b>{team.name}</b>
                <span>{team.members.length}/3 members</span>
              </div>
              <span className="text-xs font-bold opacity-60">{team.invite_code}</span>
            </button>
          ))}

          <button className="btn" type="button" onClick={onShowCreate}>Create Team</button>

          <div className="flex gap-2">
            <input
              className="form-input flex-1"
              type="text"
              placeholder="Invite code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={12}
            />
            <button
              className="btn"
              type="button"
              disabled={joinCode.length < 4}
              onClick={() => { onJoinByCode(joinCode); setJoinCode(''); }}
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* ── Create view ── */}
      {teamView === 'create' && (
        <div className="flex flex-col gap-3">
          <input
            className="form-input"
            type="text"
            placeholder="Team name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            maxLength={40}
          />
          <button
            className="btn"
            type="button"
            disabled={newName.trim().length < 2}
            onClick={() => { onCreateTeam(newName.trim()); setNewName(''); }}
          >
            Create
          </button>
        </div>
      )}

      {/* ── Lobby view ── */}
      {teamView === 'lobby' && activeTeam && (
        <div className="flex flex-col gap-3 flex-auto min-h-0">
          {/* Invite code */}
          <div className="invite-code" onClick={() => copyCode(lobby?.inviteCode ?? activeTeam.invite_code)}>
            <span className="code">{lobby?.inviteCode ?? activeTeam.invite_code}</span>
            <span className="copy-hint">{copied ? 'Copied' : 'Tap to copy'}</span>
          </div>
          {isCaptain && (
            <button className="btn ghost small" type="button" onClick={() => onRegenerateCode(activeTeam.id)} style={{ alignSelf: 'center' }}>
              Regenerate Code
            </button>
          )}

          {/* Members */}
          <div className="flex flex-col gap-2 flex-auto min-h-0 overflow-y-auto">
            {(lobby?.members ?? []).map(m => (
              <div key={m.userId} className="lobby-member">
                <span className={'ready-dot' + (m.ready ? ' on' : '')} />
                <span className="flex-1 min-w-0 truncate font-semibold">{m.username}</span>
                {m.isCaptain && <span className="role-badge">Captain</span>}
                <span className="text-xs font-bold opacity-60">{num(m.rating)}</span>
                {isCaptain && m.userId !== userId && (
                  <div className="flex gap-1 ml-1">
                    <button className="btn ghost small" type="button" style={{ fontSize: '10px', padding: '2px 6px', minHeight: 0 }} onClick={() => onTransferCaptain(activeTeam!.id, m.userId)}>Make Captain</button>
                    <button className="btn ghost small" type="button" style={{ fontSize: '10px', padding: '2px 6px', minHeight: 0 }} onClick={() => onRemoveMember(activeTeam!.id, m.userId)}>Remove</button>
                  </div>
                )}
              </div>
            ))}
            {!lobby && <p className="pick-note">Connecting to lobby...</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {lobby && (
              <button
                className={'btn' + (myReady ? '' : ' ghost')}
                type="button"
                onClick={() => onReady(activeTeam.id, !myReady)}
              >
                {myReady ? 'Ready' : 'Not Ready'}
              </button>
            )}

            {isCaptain && !teamFinding && (
              <>
                <button
                  className="btn"
                  type="button"
                  disabled={!allReady}
                  onClick={() => onStartFind(activeTeam.id)}
                >
                  Find Match
                </button>
                <div className="flex gap-2">
                  <input
                    className="form-input flex-1"
                    type="text"
                    placeholder="Challenge code"
                    value={challengeCode}
                    onChange={e => setChallengeCode(e.target.value.toUpperCase())}
                    maxLength={12}
                  />
                  <button
                    className="btn"
                    type="button"
                    disabled={challengeCode.length < 4 || !allReady}
                    onClick={() => { onChallenge(activeTeam.id, challengeCode); setChallengeCode(''); }}
                  >
                    Challenge
                  </button>
                </div>
              </>
            )}

            {teamFinding && (
              <div className="flex flex-col gap-2 items-center">
                <p className="pick-note">Finding opponent team...</p>
                {isCaptain && (
                  <button className="btn ghost" type="button" onClick={() => onCancelFind(activeTeam.id)}>Cancel</button>
                )}
              </div>
            )}

            <button className="btn ghost" type="button" onClick={() => onLeaveLobby(activeTeam.id)}>Leave Lobby</button>
          </div>
        </div>
      )}
    </section>
  );
}
