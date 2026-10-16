import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { MatchParticipant } from './match-participant.entity';
import { Round } from './round.entity';
import { Campus } from './campus.entity';

export type MatchType = 'solo' | 'quick' | 'team' | 'challenge' | 'tour';
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

  @Column({ type: 'uuid', nullable: true })
  campus_id: string | null;

  @ManyToOne(() => Campus, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campus_id' })
  campus: Campus;

  @OneToMany(() => MatchParticipant, (p) => p.match)
  participants: MatchParticipant[];

  @OneToMany(() => Round, (r) => r.match)
  rounds: Round[];

  @CreateDateColumn()
  created_at: Date;
}
