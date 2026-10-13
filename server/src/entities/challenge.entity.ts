import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { University } from './university.entity';
import { User } from './user.entity';

export type ChallengeStatus = 'open' | 'accepted' | 'lobby' | 'live' | 'completed' | 'expired' | 'cancelled';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  host_university_id: string;

  @ManyToOne(() => University, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_university_id' })
  host_university: University;

  @Column({ type: 'uuid', nullable: true })
  guest_university_id: string | null;

  @ManyToOne(() => University, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'guest_university_id' })
  guest_university: University;

  @Column('uuid')
  created_by: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'timestamptz', nullable: true })
  start_at: Date | null;

  @Column({ type: 'jsonb', default: [] })
  categories: string[];

  @Column({ type: 'int', default: 8 })
  question_count: number;

  @Column({ type: 'int', default: 1 })
  team_size: number;

  @Column({ length: 20, default: 'open' })
  status: ChallengeStatus;

  @Column({ unique: true, length: 12 })
  share_code: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
