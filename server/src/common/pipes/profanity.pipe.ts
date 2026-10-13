import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/** Basic blocklist — extend as needed. */
const BLOCKED = new Set([
  'admin', 'moderator', 'mod', 'system', 'support', 'help', 'root',
  'fuck', 'shit', 'ass', 'damn', 'bitch', 'dick', 'pussy', 'cock',
  'nigger', 'nigga', 'faggot', 'retard',
]);

@Injectable()
export class ProfanityPipe implements PipeTransform {
  transform(value: string): string {
    if (typeof value !== 'string') return value;
    const lower = value.toLowerCase();
    for (const word of BLOCKED) {
      if (lower.includes(word)) {
        throw new BadRequestException('Username contains inappropriate content');
      }
    }
    return value;
  }
}
