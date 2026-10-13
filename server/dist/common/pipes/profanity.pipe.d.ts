import { PipeTransform } from '@nestjs/common';
export declare class ProfanityPipe implements PipeTransform {
    transform(value: string): string;
}
