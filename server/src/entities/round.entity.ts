import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Match } from './match.entity';
import { Question } from './question.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  match_id: string;

  @ManyToOne(() => Match, (m) => m.rounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column('uuid')
  question_id: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ type: 'int' })
  round_number: number;

  /** User who buzzed first (null if nobody buzzed) */
  @Column({ type: 'uuid', nullable: true })
  buzz_user_id: string | null;

  @Column({ type: 'int', nullable: true })
  buzz_time_ms: number | null;

  /** Fraction of question heard at buzz (0-1) */
  @Column({ type: 'float', nullable: true })
  buzz_position: number | null;

  @Column({ type: 'int', nullable: true })
  answer_index: number | null;

  @Column({ type: 'boolean', nullable: true })
  correct: boolean | null;

  @Column({ type: 'int', default: 0 })
  points_awarded: number;

  /** User who got the rebound (steal) */
  @Column({ type: 'uuid', nullable: true })
  rebound_user_id: string | null;

  @Column({ type: 'int', nullable: true })
  rebound_answer_index: number | null;

  @Column({ type: 'boolean', nullable: true })
  rebound_correct: boolean | null;

  @Column({ type: 'int', default: 0 })
  rebound_points: number;

  @Column({ type: 'int', default: 0 })
  bonus_points: number;
}
