import { MatchesService } from './matches.service';
import { PaginationDto } from '../common/dto/pagination.dto';
export declare class MatchesController {
    private readonly service;
    constructor(service: MatchesService);
    getHistory(userId: string, dto: PaginationDto): Promise<{
        items: import("../entities").Match[];
        total: number;
        page: number;
        limit: number;
    }>;
    getDetail(id: string): Promise<import("../entities").Match>;
}
