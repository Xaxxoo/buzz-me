import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class LeaderboardQueryDto extends PaginationDto {
    period?: string;
    category?: string;
    university_id?: string;
}
