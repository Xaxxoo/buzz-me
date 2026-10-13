import { IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsUUID()
  university_id?: string;
}
