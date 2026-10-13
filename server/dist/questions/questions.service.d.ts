import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
export declare class QuestionsService {
    private repo;
    constructor(repo: Repository<Question>);
    private hash;
    private seeded;
    getDailySet(date: string): Promise<Question[]>;
    getRandomSet(count: number): Promise<Question[]>;
    create(dto: any): Promise<Question[]>;
}
