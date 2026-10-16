import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { University } from './university.entity';
import { CampusLandmark } from './campus-landmark.entity';

@Entity('campuses')
export class Campus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, unique: true })
  university_id: string | null;

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'jsonb', default: {} })
  layout: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  asset_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  fallback_image_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  osm_attribution: string | null;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => University, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'university_id' })
  university: University;

  @OneToMany(() => CampusLandmark, (l) => l.campus)
  landmarks: CampusLandmark[];

  @CreateDateColumn()
  created_at: Date;
}
