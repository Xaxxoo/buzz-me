/* Central question index. Each category lives in its own file under ./categories/.
   The first option in every `o` array is the correct one; the game shuffles on screen. */
import type { Question, QA } from '../types';

import { questions as geography } from './categories/geography';
import { questions as history } from './categories/history';
import { questions as science } from './categories/science';
import { questions as mathematics } from './categories/mathematics';
import { questions as literature } from './categories/literature';
import { questions as technology } from './categories/technology';
import { questions as music } from './categories/music';
import { questions as sport } from './categories/sport';
import { questions as art } from './categories/art';
import { questions as film } from './categories/film';
import { questions as food } from './categories/food';
import { questions as nature } from './categories/nature';
import { questions as politics } from './categories/politics';
import { questions as economics } from './categories/economics';
import { questions as medicine } from './categories/medicine';
import { questions as philosophy } from './categories/philosophy';
import { questions as space } from './categories/space';
import { questions as language } from './categories/language';
import { questions as popCulture } from './categories/pop-culture';
import { questions as mythology } from './categories/mythology';

export type Entry = QA & { b: QA };

function tag(c: string, qs: Entry[]): Question[] {
  return qs.map(q => ({ ...q, c }));
}

export const QUESTIONS: Question[] = [
  ...tag('Geography', geography),
  ...tag('History', history),
  ...tag('Science', science),
  ...tag('Mathematics', mathematics),
  ...tag('Literature', literature),
  ...tag('Technology', technology),
  ...tag('Music', music),
  ...tag('Sport', sport),
  ...tag('Art', art),
  ...tag('Film & Television', film),
  ...tag('Food & Drink', food),
  ...tag('Nature & Wildlife', nature),
  ...tag('Politics', politics),
  ...tag('Economics', economics),
  ...tag('Medicine', medicine),
  ...tag('Philosophy', philosophy),
  ...tag('Space & Astronomy', space),
  ...tag('Language', language),
  ...tag('Pop Culture', popCulture),
  ...tag('Mythology & Religion', mythology),
];

export const LOCAL_CATEGORIES = [...new Set(QUESTIONS.map(q => q.c))].sort();

export function availableCount(cats: string[]): number {
  if (cats.length === 0) return QUESTIONS.length;
  return QUESTIONS.filter(q => cats.includes(q.c)).length;
}
