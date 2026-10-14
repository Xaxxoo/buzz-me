import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export type ReportSubjectType = 'player' | 'question';
export type ReportStatus = 'open' | 'reviewed' | 'resolved' | 'dismissed';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  reporter_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ length: 20 })
  subject_type: ReportSubjectType;

  /** UUID of the reported player or question */
  @Column('uuid')
  subject_id: string;

  @Column({ length: 100 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 20, default: 'open' })
  status: ReportStatus;

  @CreateDateColumn()
  created_at: Date;
}
