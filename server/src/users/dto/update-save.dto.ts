import { IsObject } from 'class-validator';

export class UpdateSaveDto {
  @IsObject()
  save: Record<string, any>;
}
