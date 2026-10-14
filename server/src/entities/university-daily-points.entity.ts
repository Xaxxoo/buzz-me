import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique,
} from 'typeorm';

/** Tracks per-player per-day university points to enforce a daily cap. */
@Entity('university_daily_points')
@Unique(['user_id', 'date'])
export class UniversityDailyPoints {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column('uuid')
  university_id: string;

  /** ISO date string YYYY-MM-DD */
  @Column({ length: 10 })
  date: string;

  @Column({ type: 'int', default: 0 })
  points_awarded: number;

  @CreateDateColumn()
  created_at: Date;
}
