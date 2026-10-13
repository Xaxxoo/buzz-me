import { IsUUID } from 'class-validator';

export class LinkUniversityDto {
  @IsUUID()
  university_id: string;
}
