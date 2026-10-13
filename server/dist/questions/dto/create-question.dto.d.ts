export declare class CreateQuestionDto {
    category_id: string;
    text: string;
    options: string[];
    correct_option_index: number;
    bonus_text?: string;
    bonus_options?: string[];
    difficulty?: string;
    source?: string;
}
