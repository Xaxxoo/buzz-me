import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { MatchParticipant } from './match-participant.entity';
import { Round } from './round.entity';

export type MatchType = 'solo' | 'quick' | 'team' | 'challenge';
export type MatchStatus = 'pending' | 'active' | 'completed' | 'abandoned';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 15 })
  type: MatchType;

  @Column({ default: true })
  ranked: boolean;

  @Column({ length: 15, default: 'pending' })
  status: MatchStatus;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;

  @Column({ type: 'int', default: 8 })
  question_count: number;

  @OneToMany(() => MatchParticipant, (p) => p.match)
  participants: MatchParticipant[];

  @OneToMany(() => Round, (r) => r.match)
  rounds: Round[];

  @CreateDateColumn()
  created_at: Date;
}
