import { IsString, IsUUID, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsIn(['player', 'question'])
  subject_type: 'player' | 'question';

  @IsUUID()
  subject_id: string;

  @IsString()
  @MaxLength(100)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
