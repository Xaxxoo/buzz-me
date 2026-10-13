import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
export declare class QuestionsController {
    private readonly service;
    constructor(service: QuestionsService);
    getDaily(): Promise<import("../entities").Question[]>;
    create(dto: CreateQuestionDto): Promise<import("../entities").Question[]>;
}
