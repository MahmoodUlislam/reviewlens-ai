import { parse } from "csv-parse/sync";
import { Review } from "@/types";
import { v4 as uuidv4 } from "uuid";

/* ------------------------------------------------------------------ */
/*  Keyword pools — used for fuzzy header matching                     */
/* ------------------------------------------------------------------ */
const FIELD_KEYWORDS: Record<keyof Omit<Review, "id" | "sentiment">, string[]> = {
  rating: ["rating", "ratings", "star", "stars", "score", "grade", "rank", "note", "point", "points", "evaluation"],
  title: ["title", "headline", "heading", "subject", "summary"],
  body: [
    "body", "text", "review", "reviews", "content", "comment", "comments",
    "description", "feedback", "opinion", "message", "detail", "details",
    "review_text", "review_body", "review_content", "reviewtext",
  ],
  date: ["date", "time", "timestamp", "datetime", "created", "posted", "published", "reviewed", "created_at", "updated_at"],
  reviewer: ["reviewer", "author", "user", "name", "username", "user_name", "customer", "writer", "profile", "display_name"],
  verified: ["verified", "verified_purchase", "is_verified", "confirmed", "trusted"],
};

/* ------------------------------------------------------------------ */
/*  Fuzzy helpers                                                      */
/* ------------------------------------------------------------------ */

/** Normalize a header string for comparison */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Simple word-overlap similarity between 0 and 1 */
function headerSimilarity(header: string, keywords: string[]): number {
  const norm = normalize(header);
  // Exact match against any keyword
  for (const kw of keywords) {
    if (norm === kw) return 1;
  }
  // Check if header contains a keyword or vice-versa
  for (const kw of keywords) {
    if (norm.includes(kw) || kw.includes(norm)) return 0.8;
  }
  // Word overlap
  const headerWords = norm.split(/\s+/);
  let best = 0;
  for (const kw of keywords) {
    const kwWords = kw.split(/\s+/);
    const overlap = headerWords.filter((w) => kwWords.includes(w)).length;
    const score = overlap / Math.max(headerWords.length, kwWords.length);
    if (score > best) best = score;
  }
  return best * 0.6;
}

/* ------------------------------------------------------------------ */
/*  Content-based heuristics                                           */
/* ------------------------------------------------------------------ */

const DATE_PATTERNS = [
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/,           // 2024-01-15
  /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/,         // 15/01/2024 or 1-15-24
  /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/,     // January 15, 2024
  /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/,       // 15 January 2024
  /^[A-Za-z]{3,9}\s+\d{4}/,                  // March 2024
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}T/,           // ISO 8601
];

function looksLikeDate(value: string): boolean {
  const trimmed = value.trim();
  return DATE_PATTERNS.some((p) => p.test(trimmed));
}

function looksLikeNumber(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function looksLikeBoolean(value: string): boolean {
  return ["true", "false", "yes", "no", "1", "0", "y", "n"].includes(value.trim().toLowerCase());
}

interface ColumnProfile {
  header: string;
  avgLength: number;
  maxLength: number;
  numericRatio: number;    // fraction of non-empty values that are numeric
  numericValues: number[]; // parsed numeric values
  dateRatio: number;       // fraction that look like dates
  boolRatio: number;       // fraction that look like booleans
  emptyRatio: number;
  sampleValues: string[];
}

function profileColumns(headers: string[], rows: Record<string, string>[]): Map<string, ColumnProfile> {
  const profiles = new Map<string, ColumnProfile>();
  const sampleSize = Math.min(rows.length, 50);
  const sample = rows.slice(0, sampleSize);

  for (const header of headers) {
    const values = sample.map((r) => (r[header] ?? "").trim());
    const nonEmpty = values.filter((v) => v.length > 0);

    const numericValues: number[] = [];
    let dateCount = 0;
    let boolCount = 0;

    for (const v of nonEmpty) {
      if (looksLikeNumber(v)) numericValues.push(parseFloat(v));
      if (looksLikeDate(v)) dateCount++;
      if (looksLikeBoolean(v)) boolCount++;
    }

    profiles.set(header, {
      header,
      avgLength: nonEmpty.length > 0 ? nonEmpty.reduce((s, v) => s + v.length, 0) / nonEmpty.length : 0,
      maxLength: nonEmpty.length > 0 ? Math.max(...nonEmpty.map((v) => v.length)) : 0,
      numericRatio: nonEmpty.length > 0 ? numericValues.length / nonEmpty.length : 0,
      numericValues,
      dateRatio: nonEmpty.length > 0 ? dateCount / nonEmpty.length : 0,
      boolRatio: nonEmpty.length > 0 ? boolCount / nonEmpty.length : 0,
      emptyRatio: values.length > 0 ? (values.length - nonEmpty.length) / values.length : 1,
      sampleValues: nonEmpty.slice(0, 5),
    });
  }

  return profiles;
}

/* ------------------------------------------------------------------ */
/*  Column scoring — combine header + content signals                  */
/* ------------------------------------------------------------------ */

type ReviewField = keyof Omit<Review, "id" | "sentiment">;

interface FieldScore {
  header: string;
  score: number;
}

function scoreColumns(
  profiles: Map<string, ColumnProfile>,
): Record<ReviewField, FieldScore | null> {
  const candidates: Record<ReviewField, FieldScore[]> = {
    rating: [],
    title: [],
    body: [],
    date: [],
    reviewer: [],
    verified: [],
  };

  for (const [header, prof] of profiles) {
    // --- Rating ---
    const ratingHeaderScore = headerSimilarity(header, FIELD_KEYWORDS.rating);
    let ratingContentScore = 0;
    if (prof.numericRatio > 0.7 && prof.numericValues.length > 0) {
      const min = Math.min(...prof.numericValues);
      const max = Math.max(...prof.numericValues);
      // Likely a rating if values are in a small bounded range
      if (min >= 0 && max <= 10 && prof.avgLength < 5) {
        ratingContentScore = 0.7;
        if (max <= 5) ratingContentScore = 0.9;
      }
    }
    candidates.rating.push({ header, score: Math.max(ratingHeaderScore, ratingContentScore) });

    // --- Body (review text) ---
    const bodyHeaderScore = headerSimilarity(header, FIELD_KEYWORDS.body);
    let bodyContentScore = 0;
    if (prof.avgLength > 40 && prof.numericRatio < 0.3 && prof.dateRatio < 0.3) {
      bodyContentScore = Math.min(1, prof.avgLength / 200); // longer text = more likely body
    }
    candidates.body.push({ header, score: Math.max(bodyHeaderScore, bodyContentScore) });

    // --- Title ---
    const titleHeaderScore = headerSimilarity(header, FIELD_KEYWORDS.title);
    let titleContentScore = 0;
    if (prof.avgLength > 5 && prof.avgLength < 100 && prof.numericRatio < 0.3 && prof.dateRatio < 0.3) {
      titleContentScore = 0.3; // moderate signal
    }
    candidates.title.push({ header, score: Math.max(titleHeaderScore, titleContentScore) });

    // --- Date ---
    const dateHeaderScore = headerSimilarity(header, FIELD_KEYWORDS.date);
    const dateContentScore = prof.dateRatio > 0.5 ? prof.dateRatio : 0;
    candidates.date.push({ header, score: Math.max(dateHeaderScore, dateContentScore) });

    // --- Reviewer ---
    const reviewerHeaderScore = headerSimilarity(header, FIELD_KEYWORDS.reviewer);
    let reviewerContentScore = 0;
    if (prof.avgLength > 2 && prof.avgLength < 40 && prof.numericRatio < 0.2 && prof.dateRatio < 0.2 && prof.boolRatio < 0.2) {
      reviewerContentScore = 0.2;
    }
    candidates.reviewer.push({ header, score: Math.max(reviewerHeaderScore, reviewerContentScore) });

    // --- Verified ---
    const verifiedHeaderScore = headerSimilarity(header, FIELD_KEYWORDS.verified);
    const verifiedContentScore = prof.boolRatio > 0.7 ? prof.boolRatio * 0.6 : 0;
    candidates.verified.push({ header, score: Math.max(verifiedHeaderScore, verifiedContentScore) });
  }

  // Assign fields greedily — highest-scoring first, no column reuse
  const assigned = new Set<string>();
  const result: Record<ReviewField, FieldScore | null> = {
    rating: null,
    title: null,
    body: null,
    date: null,
    reviewer: null,
    verified: null,
  };

  // Priority order: body first (most important), then rating, title, date, reviewer, verified
  // Title before reviewer so a "title" header isn't stolen by reviewer's content heuristic
  const fieldPriority: ReviewField[] = ["body", "rating", "title", "date", "reviewer", "verified"];

  for (const field of fieldPriority) {
    const sorted = candidates[field]
      .filter((c) => !assigned.has(c.header) && c.score > 0.15)
      .sort((a, b) => b.score - a.score);

    if (sorted.length > 0) {
      result[field] = sorted[0];
      assigned.add(sorted[0].header);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Rating normalization                                               */
/* ------------------------------------------------------------------ */

function detectRatingScale(values: number[]): number {
  if (values.length === 0) return 5;
  const max = Math.max(...values);
  if (max <= 5) return 5;
  if (max <= 10) return 10;
  if (max <= 100) return 100;
  return max;
}

function normalizeRating(value: number, scale: number): number {
  if (scale === 5) return Math.min(5, Math.max(0, value));
  const normalized = (value / scale) * 5;
  return Math.min(5, Math.max(0, Math.round(normalized * 10) / 10));
}

/* ------------------------------------------------------------------ */
/*  Date normalization                                                 */
/* ------------------------------------------------------------------ */

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Try native Date parsing — handles most standard formats
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1970 && parsed.getFullYear() < 2100) {
    return parsed.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  // Try DD/MM/YYYY or DD-MM-YYYY (ambiguous — assume day-first if first part > 12)
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const fullYear = y.length === 2 ? (parseInt(y) > 50 ? "19" : "20") + y : y;
    // If first number > 12, it's definitely the day
    if (parseInt(d) > 12) {
      const attempt = new Date(`${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      if (!isNaN(attempt.getTime())) return attempt.toISOString().split("T")[0];
    }
  }

  return trimmed; // Return as-is if we can't parse
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface ColumnMapping {
  rating: string | null;
  title: string | null;
  body: string | null;
  date: string | null;
  reviewer: string | null;
  verified: string | null;
}

export interface ParseResult {
  reviews: Review[];
  mapping: ColumnMapping;
  warnings: string[];
  ratingScale: number;
}

export function parseCSV(csvContent: string): Review[] {
  const result = parseCSVDetailed(csvContent);
  return result.reviews;
}

export function parseCSVDetailed(csvContent: string): ParseResult {
  const warnings: string[] = [];

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    return { reviews: [], mapping: { rating: null, title: null, body: null, date: null, reviewer: null, verified: null }, warnings: ["CSV contains no data rows."], ratingScale: 5 };
  }

  const headers = Object.keys(records[0]);
  const profiles = profileColumns(headers, records);
  const mapping = scoreColumns(profiles);

  // Build the column mapping for transparency
  const columnMapping: ColumnMapping = {
    rating: mapping.rating?.header ?? null,
    title: mapping.title?.header ?? null,
    body: mapping.body?.header ?? null,
    date: mapping.date?.header ?? null,
    reviewer: mapping.reviewer?.header ?? null,
    verified: mapping.verified?.header ?? null,
  };

  if (!columnMapping.body) {
    warnings.push("Could not detect a review text column. The longest text column will be used as fallback.");
    // Fallback: pick the column with the longest average text
    let bestHeader: string | null = null;
    let bestAvg = 0;
    for (const [header, prof] of profiles) {
      if (prof.avgLength > bestAvg) {
        bestAvg = prof.avgLength;
        bestHeader = header;
      }
    }
    if (bestHeader) columnMapping.body = bestHeader;
  }

  if (!columnMapping.body) {
    warnings.push("No text column found — cannot extract reviews.");
    return { reviews: [], mapping: columnMapping, warnings, ratingScale: 5 };
  }

  // Detect rating scale
  let ratingScale = 5;
  if (columnMapping.rating) {
    const prof = profiles.get(columnMapping.rating);
    if (prof) ratingScale = detectRatingScale(prof.numericValues);
  }

  if (ratingScale !== 5) {
    warnings.push(`Detected ${ratingScale}-point rating scale — ratings will be normalized to 1–5.`);
  }

  // Build reviews
  let skippedEmpty = 0;
  const reviews: Review[] = [];

  for (const row of records) {
    const bodyText = (columnMapping.body ? row[columnMapping.body] ?? "" : "").trim();
    if (!bodyText) {
      skippedEmpty++;
      continue;
    }

    const rawRating = columnMapping.rating ? parseFloat(row[columnMapping.rating] || "0") : 0;
    const rating = columnMapping.rating && !isNaN(rawRating) ? normalizeRating(rawRating, ratingScale) : 0;
    const title = columnMapping.title ? (row[columnMapping.title] ?? "").trim() : "";
    const rawDate = columnMapping.date ? (row[columnMapping.date] ?? "").trim() : "";
    const date = normalizeDate(rawDate);
    const reviewer = columnMapping.reviewer ? (row[columnMapping.reviewer] ?? "").trim() || "Anonymous" : "Anonymous";
    const verifiedRaw = columnMapping.verified ? (row[columnMapping.verified] ?? "").trim().toLowerCase() : "";
    const verified = ["true", "yes", "1", "y"].includes(verifiedRaw);

    reviews.push({
      id: uuidv4(),
      rating,
      title,
      body: bodyText,
      date,
      reviewer,
      verified,
    });
  }

  if (skippedEmpty > 0) {
    warnings.push(`Skipped ${skippedEmpty} row(s) with empty review text.`);
  }

  return { reviews, mapping: columnMapping, warnings, ratingScale };
}
