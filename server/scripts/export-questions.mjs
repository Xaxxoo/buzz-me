/**
 * Reads every category file in lib/data/categories/ and writes a single
 * server/src/seeds/questions.json that the seed script can import.
 *
 * Run:  node scripts/export-questions.mjs
 * Also runs automatically as part of `npm run build`.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const categoriesDir = join(__dirname, '../../lib/data/categories');

/** Maps filename (without .ts) to the display name used in-game. */
const CATEGORY_MAP = {
  'geography':   'Geography',
  'history':     'History',
  'science':     'Science',
  'mathematics': 'Mathematics',
  'literature':  'Literature',
  'technology':  'Technology',
  'music':       'Music',
  'sport':       'Sport',
  'art':         'Art',
  'film':        'Film & Television',
  'food':        'Food & Drink',
  'nature':      'Nature & Wildlife',
  'politics':    'Politics',
  'economics':   'Economics',
  'medicine':    'Medicine',
  'philosophy':  'Philosophy',
  'space':       'Space & Astronomy',
  'language':    'Language',
  'pop-culture': 'Pop Culture',
  'mythology':   'Mythology & Religion',
};

const allQuestions = [];

for (const [filename, categoryName] of Object.entries(CATEGORY_MAP)) {
  const filePath = join(categoriesDir, `${filename}.ts`);
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`  Skipping ${filename}.ts (file not found)`);
    continue;
  }

  // Strip the `import type ...` line — it's TypeScript-only and erased at runtime
  const cleaned = raw.replace(/^import\s+type\s+.*;\s*$/m, '');

  // Extract the exported array literal
  const match = cleaned.match(
    /export\s+const\s+questions[^=]*=\s*(\[[\s\S]*\])\s*;?\s*$/,
  );
  if (!match) {
    console.warn(`  Could not parse array from ${filename}.ts`);
    continue;
  }

  // Evaluate the array literal (safe — these are our own data files)
  const questions = new Function(`return ${match[1]}`)();

  for (const q of questions) {
    allQuestions.push({ c: categoryName, t: q.t, o: q.o, b: q.b });
  }
}

const outPath = join(__dirname, '../src/seeds/questions.json');
writeFileSync(outPath, JSON.stringify(allQuestions, null, 2));
console.log(
  `Exported ${allQuestions.length} questions (${Object.keys(CATEGORY_MAP).length} categories) → src/seeds/questions.json`,
);
