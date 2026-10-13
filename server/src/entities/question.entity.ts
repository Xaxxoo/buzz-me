import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  category_id: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ length: 20, default: 'medium' })
  difficulty: string;

  @Column({ type: 'text' })
  text: string;

  /** Answer options as JSON array; first element is always correct */
  @Column({ type: 'jsonb' })
  options: string[];

  @Column({ type: 'int', default: 0 })
  correct_option_index: number;

  @Column({ type: 'text', nullable: true })
  bonus_text: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bonus_options: string[] | null;

  @Column({ nullable: true })
  source: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
