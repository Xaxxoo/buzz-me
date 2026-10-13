import { UniversitiesService } from './universities.service';
import { SearchUniversityDto } from './dto/search-university.dto';
export declare class UniversitiesController {
    private readonly service;
    constructor(service: UniversitiesService);
    findAll(dto: SearchUniversityDto): Promise<{
        items: import("../entities").University[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<import("../entities").University>;
}
