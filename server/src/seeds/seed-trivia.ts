import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Category } from '../entities/category.entity';
import { University } from '../entities/university.entity';
import { User } from '../entities/user.entity';
import { DeviceSession } from '../entities/device-session.entity';
import { Campus } from '../entities/campus.entity';
import { CampusLandmark } from '../entities/campus-landmark.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawQuestion {
  text: string;
  answer: string;
  category: string;
  difficulty: string;
  source: string;
}

interface GeneratedQuestion extends RawQuestion {
  wrongOptions: string[];
}

// ---------------------------------------------------------------------------
// Category normalization
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, string> = {
  'sports & leisure': 'Sport',
  'sports': 'Sport',
  'sport': 'Sport',
  'history & holidays': 'History',
  'history': 'History',
  'science & nature': 'Science',
  'science': 'Science',
  'nature': 'Science',
  'entertainment': 'Entertainment',
  'entertainment & media': 'Entertainment',
  'geography': 'Geography',
  'art & literature': 'Art & Literature',
  'art': 'Art & Literature',
  'literature': 'Art & Literature',
  'music': 'Music',
  'food & drink': 'Food & Drink',
  'food': 'Food & Drink',
  'general': 'General Knowledge',
  'general knowledge': 'General Knowledge',
  'people & places': 'People & Places',
  'religion': 'Religion',
  'mythology': 'Mythology',
  'technology': 'Technology',
  'language': 'Language',
  'math': 'Mathematics',
  'mathematics': 'Mathematics',
  'politics': 'Politics',
  'movies': 'Entertainment',
  'television': 'Entertainment',
  'animals': 'Science',
};

function normalizeCategory(raw: string): string {
  const cleaned = raw.replace(/[\xa0]+/g, ' ').trim();
  const key = cleaned.toLowerCase();
  return CATEGORY_MAP[key] || cleaned; // keep original (title-cased) if no mapping
}

// ---------------------------------------------------------------------------
// Data cleaning helpers
// ---------------------------------------------------------------------------

function cleanText(val: any): string {
  if (val == null) return '';
  return String(val)
    .replace(/\uFEFF/g, '')       // BOM
    .replace(/[\xa0]+/g, ' ')     // NBSP
    .replace(/^`+/, '')           // leading backticks
    .trim();
}

function cleanAnswer(val: any): string {
  if (val == null) return '';
  return String(val)
    .replace(/\uFEFF/g, '')
    .replace(/[\xa0]+/g, ' ')
    .replace(/^`+/, '')
    .replace(/\s*\*CORRECT\*?\s*$/i, '')  // *CORRECT* suffix
    .trim();
}

function normalizeDifficulty(raw: string): string {
  const d = raw.toLowerCase().trim();
  if (d === 'easy') return 'easy';
  if (d === 'hard') return 'hard';
  return 'medium'; // includes "-", empty, etc.
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function dedupeKey(text: string): string {
  return text.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Phase 1: Parse CSV
// ---------------------------------------------------------------------------

function parseCSV(filePath: string): RawQuestion[] {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/\uFEFF/, '');
  const records: any[] = csvParse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const questions: RawQuestion[] = [];
  for (const row of records) {
    const text = cleanText(row['Question']);
    const answer = cleanAnswer(row['Answer']);
    const category = normalizeCategory(row['Category'] || 'General Knowledge');
    const difficulty = normalizeDifficulty(row['Difficulty'] || 'medium');

    if (!text || !answer) continue;

    questions.push({ text, answer, category, difficulty, source: 'trivia-db-1' });
  }

  return questions;
}

// ---------------------------------------------------------------------------
// Phase 1: Parse Excel
// ---------------------------------------------------------------------------

function parseExcel(filePath: string): RawQuestion[] {
  const workbook = XLSX.readFile(filePath);
  const questions: RawQuestion[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const nameLower = sheetName.toLowerCase();

    if (nameLower.includes('millionaire') && nameLower.includes('easy')) {
      parseMillionaireSheet(rows, 'easy', 'millionaire-easy', questions);
    } else if (nameLower.includes('millionaire') && nameLower.includes('hard')) {
      parseMillionaireSheet(rows, 'hard', 'millionaire-hard', questions);
    } else if (nameLower.includes('5th grader') || nameLower.includes('smarther')) {
      parseMillionaireSheet(rows, 'medium', 'smarter-than-5th-grader', questions);
    } else if (nameLower === 'trivia') {
      parseTriviaSheet(rows, questions);
    } else if (nameLower.includes('category removed') || nameLower.includes('needs category')) {
      parseCategoryRemovedSheet(rows, questions);
    } else {
      console.log(`  Skipping unknown sheet: "${sheetName}"`);
    }
  }

  return questions;
}

/**
 * Millionaire / 5th-Grader sheets: 3 Q&A pairs per row at cols 0/1, 3/4, 6/7.
 * No category column → defaults to "General Knowledge".
 */
function parseMillionaireSheet(
  rows: any[][],
  difficulty: string,
  source: string,
  out: RawQuestion[],
) {
  const pairs = [[0, 1], [3, 4], [6, 7]];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    for (const [qCol, aCol] of pairs) {
      const text = cleanText(row[qCol]);
      const answer = cleanAnswer(row[aCol]);
      if (!text || !answer) continue;
      out.push({ text, answer, category: 'General Knowledge', difficulty, source });
    }
  }
}

/**
 * "Trivia" sheet: (Category, Question, Answer) × 3 per row.
 * Cols: 0/1/2, 3/4/5, 6/7/8
 */
function parseTriviaSheet(rows: any[][], out: RawQuestion[]) {
  const triples = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    for (const [catCol, qCol, aCol] of triples) {
      const category = normalizeCategory(cleanText(row[catCol]) || 'General Knowledge');
      const text = cleanText(row[qCol]);
      const answer = cleanAnswer(row[aCol]);
      if (!text || !answer) continue;
      out.push({ text, answer, category, difficulty: 'medium', source: 'trivia-printable' });
    }
  }
}

/**
 * "Question Needs Category Removed" sheet: (Category, Difficulty, Question, Answer) per row.
 */
function parseCategoryRemovedSheet(rows: any[][], out: RawQuestion[]) {
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const category = normalizeCategory(cleanText(row[0]) || 'General Knowledge');
    const difficulty = normalizeDifficulty(cleanText(row[1]) || 'medium');
    const text = cleanText(row[2]);
    const answer = cleanAnswer(row[3]);
    if (!text || !answer) continue;
    out.push({ text, answer, category, difficulty, source: 'trivia-cat-removed' });
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Claude API — generate wrong options
// ---------------------------------------------------------------------------

const BATCH_SIZE = 25;
const CONCURRENCY = 5;
const RPM_CAP = 50;
const MAX_RETRIES = 3;

const PROGRESS_FILE = path.resolve(__dirname, '../../.seed-progress.json');
const JSONL_FILE = path.resolve(__dirname, '../../.seed-generated.jsonl');

interface ProgressState {
  completedBatches: number[];
  totalBatches: number;
}

function loadProgress(): ProgressState {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { completedBatches: [], totalBatches: 0 };
}

function saveProgress(state: ProgressState) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state));
}

function appendJSONL(items: GeneratedQuestion[]) {
  const lines = items.map((q) => JSON.stringify(q)).join('\n') + '\n';
  fs.appendFileSync(JSONL_FILE, lines);
}

function loadJSONL(): GeneratedQuestion[] {
  if (!fs.existsSync(JSONL_FILE)) return [];
  const content = fs.readFileSync(JSONL_FILE, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').map((line) => JSON.parse(line));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateWrongOptions(
  client: Anthropic,
  batch: RawQuestion[],
  batchIndex: number,
): Promise<GeneratedQuestion[]> {
  const questionsPayload = batch.map((q, i) => ({
    i,
    question: q.text,
    correct_answer: q.answer,
    category: q.category,
  }));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 4096,
        system: `You generate plausible wrong answers for trivia questions. For each question, provide exactly 3 wrong answers that are plausible but clearly incorrect. Return ONLY a JSON array where each element has "i" (the question index) and "wrong" (array of 3 wrong answer strings). No markdown, no explanation.`,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(questionsPayload),
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      // Strip potential markdown code fences
      const jsonStr = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      const parsed: { i: number; wrong: string[] }[] = JSON.parse(jsonStr);

      const results: GeneratedQuestion[] = [];
      for (const item of parsed) {
        const q = batch[item.i];
        if (!q) continue;
        const wrongs = (item.wrong || []).map((w: any) => String(w).trim()).filter(Boolean);
        if (wrongs.length < 3) {
          // Pad with generic fillers if Claude returned fewer than 3
          while (wrongs.length < 3) wrongs.push(`Not ${q.answer}`);
        }
        results.push({ ...q, wrongOptions: wrongs.slice(0, 3) });
      }

      // For any questions that didn't get results, add fallback
      const answeredIndices = new Set(parsed.map((p) => p.i));
      for (let i = 0; i < batch.length; i++) {
        if (!answeredIndices.has(i)) {
          results.push({
            ...batch[i],
            wrongOptions: [`Not ${batch[i].answer}`, `None of the above`, `All of the above`],
          });
        }
      }

      return results;
    } catch (err: any) {
      console.error(`  Batch ${batchIndex} attempt ${attempt} failed: ${err.message}`);
      // Abort immediately on billing/auth errors — retrying won't help
      if (err.message?.includes('credit balance') || err.message?.includes('authentication') || err.status === 401) {
        throw new Error(`Fatal API error (not retryable): ${err.message}`);
      }
      if (attempt < MAX_RETRIES) {
        await sleep(2000 * attempt); // backoff
      } else {
        // Return fallback for entire batch
        console.error(`  Batch ${batchIndex} exhausted retries, using fallback wrong options`);
        return batch.map((q) => ({
          ...q,
          wrongOptions: [`Not ${q.answer}`, `None of the above`, `All of the above`],
        }));
      }
    }
  }

  return []; // unreachable
}

async function generateAllWrongOptions(
  questions: RawQuestion[],
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment');
  }

  const client = new Anthropic({ apiKey });

  // Split into batches
  const batches: RawQuestion[][] = [];
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }

  const progress = loadProgress();
  progress.totalBatches = batches.length;
  const completedSet = new Set(progress.completedBatches);

  console.log(`\nPhase 3: Generating wrong options via Claude API`);
  console.log(`  Total batches: ${batches.length} (${questions.length} questions)`);
  console.log(`  Already completed: ${completedSet.size} batches`);
  console.log(`  Concurrency: ${CONCURRENCY}, RPM cap: ${RPM_CAP}\n`);

  // Rate limiter: track timestamps of sent requests
  const requestTimestamps: number[] = [];

  async function waitForRateLimit() {
    while (true) {
      const now = Date.now();
      // Remove timestamps older than 60 seconds
      while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60_000) {
        requestTimestamps.shift();
      }
      if (requestTimestamps.length < RPM_CAP) {
        requestTimestamps.push(Date.now());
        return;
      }
      const waitMs = requestTimestamps[0] + 60_000 - now + 100;
      console.log(`  Rate limit reached, waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }
  }

  let processedCount = completedSet.size;

  // Process batches with concurrency
  async function processBatch(batchIndex: number) {
    if (completedSet.has(batchIndex)) return;

    await waitForRateLimit();
    const results = await generateWrongOptions(client, batches[batchIndex], batchIndex);
    appendJSONL(results);

    progress.completedBatches.push(batchIndex);
    completedSet.add(batchIndex);
    saveProgress(progress);
    processedCount++;

    if (processedCount % 10 === 0 || processedCount === batches.length) {
      console.log(`  Progress: ${processedCount}/${batches.length} batches`);
    }
  }

  // Run with bounded concurrency
  const pending: Promise<void>[] = [];
  for (let i = 0; i < batches.length; i++) {
    if (completedSet.has(i)) continue;

    const p = processBatch(i).catch((err) => {
      console.error(`  Batch ${i} failed permanently: ${err.message}`);
    });
    pending.push(p);

    if (pending.length >= CONCURRENCY) {
      await Promise.race(pending);
      // Remove settled promises
      for (let j = pending.length - 1; j >= 0; j--) {
        // Check if settled by racing with an instant resolve
        const settled = await Promise.race([
          pending[j].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) pending.splice(j, 1);
      }
    }
  }

  // Wait for remaining
  await Promise.all(pending);

  console.log(`\n  Generation complete. Loading results from JSONL...`);
  return loadJSONL();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Trivia Seed Script ===\n');

  // --- Phase 1: Parse ---
  console.log('Phase 1: Parsing source files...');

  const csvPath = path.resolve(__dirname, '../../../Trivia Database 1.csv');
  const xlsxPath = path.resolve(__dirname, '../../../Trivia-Printable new.xlsx');

  const allQuestions: RawQuestion[] = [];
  const seenKeys = new Set<string>();

  // CSV
  if (fs.existsSync(csvPath)) {
    const csvQuestions = parseCSV(csvPath);
    let csvAdded = 0;
    for (const q of csvQuestions) {
      const key = dedupeKey(q.text);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allQuestions.push(q);
        csvAdded++;
      }
    }
    console.log(`  CSV: ${csvQuestions.length} parsed, ${csvAdded} unique`);
  } else {
    console.log(`  CSV not found at ${csvPath}, skipping`);
  }

  // Excel
  if (fs.existsSync(xlsxPath)) {
    const xlsxQuestions = parseExcel(xlsxPath);
    let xlsxAdded = 0;
    for (const q of xlsxQuestions) {
      const key = dedupeKey(q.text);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allQuestions.push(q);
        xlsxAdded++;
      }
    }
    console.log(`  Excel: ${xlsxQuestions.length} parsed, ${xlsxAdded} unique (after dedup with CSV)`);
  } else {
    console.log(`  Excel not found at ${xlsxPath}, skipping`);
  }

  console.log(`  Total unique questions: ${allQuestions.length}\n`);

  if (allQuestions.length === 0) {
    console.log('No questions found. Exiting.');
    return;
  }

  // --- Phase 2: Connect to DB, seed categories, find existing questions ---
  console.log('Phase 2: Connecting to database...');

  const url = process.env.DATABASE_URL;
  const ds = new DataSource({
    type: 'postgres',
    ...(url
      ? { url, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'quad',
        }),
    entities: [University, Question, Category, User, DeviceSession, Campus, CampusLandmark],
    synchronize: true,
  });

  await ds.initialize();
  console.log('  Connected to database');

  const catRepo = ds.getRepository(Category);
  const qRepo = ds.getRepository(Question);

  // Seed categories
  const catNames = [...new Set(allQuestions.map((q) => q.category))];
  const existingCats = await catRepo.find();
  const existingCatSlugs = new Set(existingCats.map((c) => c.slug));
  const categoryMap = new Map<string, Category>();
  existingCats.forEach((c) => categoryMap.set(c.name, c));

  const newCats = catNames
    .filter((name) => !existingCatSlugs.has(slugify(name)) && !categoryMap.has(name))
    .map((name) => catRepo.create({ name, slug: slugify(name), active: true }));

  if (newCats.length > 0) {
    const saved = await catRepo.save(newCats);
    saved.forEach((c) => categoryMap.set(c.name, c));
  }
  console.log(`  Categories: ${newCats.length} new, ${categoryMap.size} total`);

  // Check existing questions to skip duplicates
  const existingQTexts = new Set(
    (await qRepo.find({ select: ['text'] })).map((q) => q.text.toLowerCase().trim()),
  );

  const questionsToGenerate = allQuestions.filter(
    (q) => !existingQTexts.has(q.text.toLowerCase().trim()),
  );

  console.log(`  Questions already in DB: ${existingQTexts.size}`);
  console.log(`  Questions to generate: ${questionsToGenerate.length}\n`);

  if (questionsToGenerate.length === 0) {
    console.log('All questions already exist in DB. Nothing to do.');
    await ds.destroy();
    return;
  }

  // --- Phase 3: Generate wrong options ---
  const generated = await generateAllWrongOptions(questionsToGenerate);
  console.log(`  Generated: ${generated.length} questions with wrong options\n`);

  // --- Phase 4: Insert into database ---
  console.log('Phase 4: Inserting into database...');

  let inserted = 0;
  let skipped = 0;
  const insertBatch: Question[] = [];

  for (const q of generated) {
    const cat = categoryMap.get(q.category);
    if (!cat) {
      skipped++;
      continue;
    }

    // Double-check for duplicates (in case of resume)
    if (existingQTexts.has(q.text.toLowerCase().trim())) {
      skipped++;
      continue;
    }

    const options = [q.answer, ...q.wrongOptions];

    insertBatch.push(
      qRepo.create({
        category_id: cat.id,
        text: q.text,
        options,
        correct_option_index: 0,
        difficulty: q.difficulty,
        source: q.source,
        active: true,
      }),
    );

    existingQTexts.add(q.text.toLowerCase().trim());
  }

  // Batch insert 200 at a time
  for (let i = 0; i < insertBatch.length; i += 200) {
    const chunk = insertBatch.slice(i, i + 200);
    await qRepo.save(chunk);
    inserted += chunk.length;
    if ((i / 200 + 1) % 10 === 0 || i + 200 >= insertBatch.length) {
      console.log(`  Inserted: ${inserted}/${insertBatch.length}`);
    }
  }

  console.log(`\n  Total inserted: ${inserted}`);
  console.log(`  Skipped (no category / duplicate): ${skipped}`);

  // Clean up progress files
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  if (fs.existsSync(JSONL_FILE)) fs.unlinkSync(JSONL_FILE);
  console.log('  Cleaned up progress files');

  await ds.destroy();
  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
