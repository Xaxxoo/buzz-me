import { IsOptional, IsArray, IsInt, Min, Max, IsDateString, IsString } from 'class-validator';

export class CreateChallengeDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(40)
  question_count?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  team_size?: number;

  @IsOptional()
  @IsDateString()
  start_at?: string | null;
}
