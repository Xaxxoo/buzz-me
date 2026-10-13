import { Repository } from 'typeorm';
import { University } from '../entities/university.entity';
import { SearchUniversityDto } from './dto/search-university.dto';
export declare class UniversitiesService {
    private repo;
    constructor(repo: Repository<University>);
    findAll(dto: SearchUniversityDto): Promise<{
        items: University[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<University>;
}
