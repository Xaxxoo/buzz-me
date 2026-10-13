import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type LeaderboardScope = 'player' | 'university';
export type LeaderboardPeriod = 'weekly' | 'season' | 'alltime';

@Entity('leaderboard_entries')
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 15 })
  scope: LeaderboardScope;

  @Column({ length: 10 })
  period: LeaderboardPeriod;

  /** user.id or university.id depending on scope */
  @Column('uuid')
  subject_id: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  rank: number;

  @Column({ type: 'int', default: 0 })
  matches_played: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
