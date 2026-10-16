import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Campus } from './campus.entity';

@Entity('campus_landmarks')
@Unique(['campus_id', 'key'])
export class CampusLandmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campus_id: string;

  @Column({ length: 30 })
  key: string;

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'float', default: 0 })
  position_x: number;

  @Column({ type: 'float', default: 0 })
  position_y: number;

  @Column({ type: 'int', default: 5 })
  challenge_question_count: number;

  @ManyToOne(() => Campus, (c) => c.landmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campus_id' })
  campus: Campus;

  @CreateDateColumn()
  created_at: Date;
}
