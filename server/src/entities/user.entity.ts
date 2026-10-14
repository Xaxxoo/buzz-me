import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { University } from './university.entity';
import { DeviceSession } from './device-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  username: string;

  @Column({ length: 20, unique: true })
  username_lower: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ type: 'int', default: 1000 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 0 })
  matches_played: number;

  @Column({ type: 'int', default: 0 })
  matches_won: number;

  @Column({ type: 'int', default: 0 })
  matches_lost: number;

  @Column({ type: 'int', default: 0 })
  matches_drawn: number;

  @Column({ type: 'uuid', nullable: true })
  university_id: string | null;

  @ManyToOne(() => University, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'university_id' })
  university: University;

  @Column({ default: false })
  university_verified: boolean;

  @Column({ default: false })
  is_admin: boolean;

  /** { [category_slug]: [right, total] } — mirrors frontend Save.cats */
  @Column({ type: 'jsonb', default: {} })
  category_stats: Record<string, [number, number]>;

  /** Full save data synced from frontend */
  @Column({ type: 'jsonb', nullable: true })
  save_data: Record<string, any> | null;

  @OneToMany(() => DeviceSession, (s) => s.user)
  sessions: DeviceSession[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
