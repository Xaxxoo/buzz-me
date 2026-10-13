import { IsString, IsArray, IsInt, IsOptional, IsUUID, Min, Max, ArrayMinSize } from 'class-validator';

export class CreateQuestionDto {
  @IsUUID()
  category_id: string;

  @IsString()
  text: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  @Max(9)
  correct_option_index: number;

  @IsOptional()
  @IsString()
  bonus_text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bonus_options?: string[];

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
