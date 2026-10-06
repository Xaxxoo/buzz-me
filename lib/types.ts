export type Pattern = 'chief' | 'chevron' | 'bend' | 'sun' | 'bars' | 'split' | 'quarter' | 'cross';
export type Team = 'you' | 'rival';

export interface School {
  id: string;
  name: string;
  country: string;
  short: string;
  /** main crest colour */
  a: string;
  /** second crest colour */
  b: string;
  pat: Pattern;
}

/** A question and its options. The first option is always the right one. */
export interface QA {
  t: string;
  o: string[];
}

export interface Question extends QA {
  /** category */
  c: string;
  /** bonus question, asked to whoever wins the toss-up */
  b: QA;
}
