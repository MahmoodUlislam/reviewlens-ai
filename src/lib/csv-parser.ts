import { parse } from "csv-parse/sync";
import { Review } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function parseCSV(csvContent: string): Review[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  return (records as Record<string, string>[]).map((record) => {
    // Support various column name formats
    const rating = parseFloat(
      record.rating || record.Rating || record.stars || record.Stars || record.score || "0"
    );
    const title =
      record.title || record.Title || record.headline || record.Headline || "";
    const body =
      record.body ||
      record.Body ||
      record.text ||
      record.Text ||
      record.review ||
      record.Review ||
      record.content ||
      record.Content ||
      "";
    const date =
      record.date || record.Date || record.timestamp || record.Timestamp || "";
    const reviewer =
      record.reviewer ||
      record.Reviewer ||
      record.author ||
      record.Author ||
      record.name ||
      record.Name ||
      "Anonymous";
    const verified =
      (record.verified || record.Verified || "").toLowerCase() === "true";

    return {
      id: uuidv4(),
      rating: Math.min(5, Math.max(0, rating)),
      title: title.trim(),
      body: body.trim(),
      date: date.trim(),
      reviewer: reviewer.trim(),
      verified,
    } satisfies Review;
  });
}
