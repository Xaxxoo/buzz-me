import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('universities')
export class University {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ length: 10 })
  short_name: string;

  @Column()
  country: string;

  /** JSON array of email domain patterns for verification, e.g. ["unilag.edu.ng"] */
  @Column({ type: 'jsonb', default: [] })
  email_domains: string[];

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ length: 7 })
  color_a: string;

  @Column({ length: 7 })
  color_b: string;

  @Column({ length: 10 })
  pattern: string;

  @CreateDateColumn()
  created_at: Date;
}
