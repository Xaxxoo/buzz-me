import { Category } from './category.entity';
export declare class Question {
    id: string;
    category_id: string;
    category: Category;
    difficulty: string;
    text: string;
    options: string[];
    correct_option_index: number;
    bonus_text: string | null;
    bonus_options: string[] | null;
    source: string;
    active: boolean;
    created_at: Date;
}
