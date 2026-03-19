export interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  reviewer: string;
  verified: boolean;
  sentiment?: SentimentResult;
}

export interface SentimentResult {
  label: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  score: number;
}

export interface ReviewMetadata {
  platform: string;
  productName: string;
  productUrl: string;
  totalReviews: number;
  averageRating: number;
  overallRating?: number;
  totalGlobalRatings?: number;
  dateRange: { earliest: string; latest: string };
  scrapedAt: string;
}

export interface ReviewSession {
  sessionId: string;
  reviews: Review[];
  metadata: ReviewMetadata;
  analytics?: AnalyticsData;
}

export interface AnalyticsData {
  ratingDistribution: Record<number, number>;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  topKeywords: { word: string; count: number }[];
  averageRating: number;
  totalReviews: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  scopeGuardTriggered?: boolean;
  guardrailAction?: string;
}

export interface IngestRequest {
  type: "url" | "csv";
  url?: string;
  csvData?: string;
  platform?: string;
}

export interface IngestResponse {
  sessionId: string;
  metadata: ReviewMetadata;
  reviewCount: number;
  success: boolean;
  error?: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}
