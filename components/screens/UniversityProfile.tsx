'use client';

import type { UniversityProfileData } from '@/lib/types';
import type { CampusLayout3D } from '@/lib/campus-types';
import { num } from '@/lib/engine';
import { CampusScene } from '@/components/campus/CampusScene';

interface Props {
  active: boolean;
  profile: UniversityProfileData | null;
  campusLayout?: CampusLayout3D | null;
  onMenu: () => void;
}

export function UniversityProfile({ active, profile, campusLayout, onMenu }: Props) {
  if (!profile) return (
    <section className="screen enter flex-auto min-h-0 flex flex-col gap-3 overflow-y-auto" hidden={!active}>
      {active && <p style={{ font: '600 14px/1.3 var(--font-body)', opacity: 0.6, textAlign: 'center', padding: '20px 0' }}>Loading&hellip;</p>}
    </section>
  );

  return (
    <section className="screen enter flex-auto min-h-0 flex flex-col gap-3 overflow-y-auto" id="s-uni-profile" hidden={!active}>
      <div className="head flex items-center gap-3">
        <button className="back" type="button" onClick={onMenu}>Menu</button>
        <h2>{profile.short_name}</h2>
      </div>

      {campusLayout && (
        <CampusScene
          layout={campusLayout}
          schoolColors={{ a: profile.color_a, b: profile.color_b }}
          interactive={false}
        />
      )}

      <div className="uni-profile-header" style={{ '--uni-a': profile.color_a, '--uni-b': profile.color_b } as React.CSSProperties}>
        <h3>{profile.name}</h3>
        <div className="uni-profile-stats">
          <div className="uni-stat"><b>#{profile.rank}</b><span>Rank</span></div>
          <div className="uni-stat"><b>{num(profile.points)}</b><span>Points</span></div>
          <div className="uni-stat"><b>{profile.player_count}</b><span>Players</span></div>
          <div className="uni-stat"><b>{profile.avg_rating}</b><span>Avg Rating</span></div>
        </div>
        <div className="uni-record">
          <span>{profile.total_wins}W</span>
          <span>{profile.total_losses}L</span>
        </div>
      </div>

      {profile.top_players.length > 0 && (
        <div className="uni-section">
          <h4>Top Players</h4>
          <div className="flex flex-col gap-1">
            {profile.top_players.map((p, i) => (
              <div key={p.id} className="uni-player-row">
                <span className="uni-player-rank">{i + 1}</span>
                <span className="uni-player-name">{p.username}</span>
                <span className="uni-player-rating">{p.rating}</span>
                <span className="uni-player-record">{p.matches_won}W / {p.matches_played}P</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.upcoming_challenges.length > 0 && (
        <div className="uni-section">
          <h4>Upcoming Challenges</h4>
          <div className="flex flex-col gap-2">
            {profile.upcoming_challenges.map(c => (
              <div key={c.id} className="challenge-card" style={{ cursor: 'default' }}>
                <b>{c.host_university?.short_name ?? '?'} vs {c.guest_university?.short_name ?? '?'}</b>
                <span>{c.question_count} questions, team of {c.team_size}</span>
                {c.start_at && <em>{new Date(c.start_at).toLocaleDateString()}</em>}
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.recent_challenges.length > 0 && (
        <div className="uni-section">
          <h4>Recent Results</h4>
          <div className="flex flex-col gap-2">
            {profile.recent_challenges.map(c => (
              <div key={c.id} className="challenge-card" style={{ cursor: 'default' }}>
                <b>{c.host_university?.short_name ?? '?'} vs {c.guest_university?.short_name ?? '?'}</b>
                <span>{c.question_count} questions</span>
                <em>{c.status}</em>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.recent_challenges.length === 0 && profile.upcoming_challenges.length === 0 && (
        <p style={{ font: '600 14px/1.3 var(--font-body)', opacity: 0.6 }}>No challenge history yet.</p>
      )}
    </section>
  );
}
