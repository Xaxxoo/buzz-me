import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class LeaderboardQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'season', 'alltime'])
  period?: string = 'alltime';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  university_id?: string;
}
