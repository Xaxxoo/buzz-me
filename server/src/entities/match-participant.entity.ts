import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Match } from './match.entity';
import { User } from './user.entity';

@Entity('match_participants')
export class MatchParticipant {
  @PrimaryColumn('uuid')
  match_id: string;

  @PrimaryColumn('uuid')
  user_id: string;

  @ManyToOne(() => Match, (m) => m.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** 'a' or 'b' for team side */
  @Column({ type: 'varchar', length: 1, nullable: true })
  team_side: string | null;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', nullable: true })
  rating_before: number | null;

  @Column({ type: 'int', nullable: true })
  rating_after: number | null;
}
