import { Review, AnalyticsData } from "@/types";

// Common English stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "was", "are",
  "be", "has", "had", "have", "not", "no", "so", "if", "my", "its",
  "i", "we", "you", "he", "she", "they", "me", "us", "him", "her",
  "them", "what", "which", "who", "when", "where", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "than",
  "too", "very", "just", "about", "also", "as", "been", "do", "does",
  "did", "will", "would", "could", "should", "can", "may", "might",
  "shall", "am", "were", "being", "get", "got", "one", "two", "like",
  "really", "even", "much", "well", "still", "after", "before", "over",
  "only", "then", "into", "out", "up", "down", "here", "there", "your",
  "our", "their", "these", "those", "own", "same", "don", "didn", "doesn",
  "won", "isn", "aren", "wasn", "weren", "hasn", "hadn", "couldn",
  "wouldn", "shouldn", "ve", "re", "ll", "don't", "didn't", "doesn't",
  "product", "item", "thing", "things", "bought", "buy", "purchasing",
]);

export function computeAnalytics(reviews: Review[]): AnalyticsData {
  // Rating distribution
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) {
    const rounded = Math.round(review.rating);
    if (rounded >= 1 && rounded <= 5) {
      ratingDistribution[rounded]++;
    }
  }

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
  for (const review of reviews) {
    if (review.sentiment) {
      const key = review.sentiment.label.toLowerCase() as keyof typeof sentimentBreakdown;
      sentimentBreakdown[key]++;
    }
  }

  // Top keywords
  const wordCounts = new Map<string, number>();
  for (const review of reviews) {
    const text = `${review.title} ${review.body}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    for (const word of words) {
      if (!STOP_WORDS.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }
  const topKeywords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  // Average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    ratingDistribution,
    sentimentBreakdown,
    topKeywords,
    averageRating,
    totalReviews: reviews.length,
  };
}
