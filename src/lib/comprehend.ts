import {
  ComprehendClient,
  BatchDetectSentimentCommand,
} from "@aws-sdk/client-comprehend";
import { Review, SentimentResult } from "@/types";

// Uses default AWS credentials chain (profile, env vars, IAM role)
const client = new ComprehendClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function analyzeSentiment(
  reviews: Review[]
): Promise<Review[]> {
  // Comprehend batch limit is 25 documents, each max 5000 bytes
  const batchSize = 25;
  const enrichedReviews = [...reviews];

  // Build all batch promises up front so they run in parallel
  const batchPromises: Promise<void>[] = [];

  for (let i = 0; i < reviews.length; i += batchSize) {
    const batchStart = i;
    const batch = reviews.slice(batchStart, batchStart + batchSize);
    const texts = batch.map((r) => {
      const text = `${r.title} ${r.body}`.slice(0, 4900);
      // Comprehend requires non-empty text
      return text.trim() || "No content";
    });

    batchPromises.push(
      (async () => {
        try {
          const command = new BatchDetectSentimentCommand({
            TextList: texts,
            LanguageCode: "en",
          });

          const response = await client.send(command);

          if (response.ResultList) {
            for (const result of response.ResultList) {
              if (result.Index !== undefined && result.Sentiment) {
                const reviewIndex = batchStart + result.Index;
                enrichedReviews[reviewIndex] = {
                  ...enrichedReviews[reviewIndex],
                  sentiment: {
                    label: result.Sentiment as SentimentResult["label"],
                    score:
                      result.SentimentScore?.[
                        (result.Sentiment.charAt(0) +
                          result.Sentiment.slice(1).toLowerCase()) as keyof typeof result.SentimentScore
                      ] || 0,
                  },
                };
              }
            }
          }
        } catch (error) {
          console.error("Comprehend batch sentiment error:", error);
          // Fallback: use rating-based sentiment
          for (let j = 0; j < batch.length; j++) {
            const reviewIndex = batchStart + j;
            const rating = batch[j].rating;
            enrichedReviews[reviewIndex] = {
              ...enrichedReviews[reviewIndex],
              sentiment: {
                label: rating >= 4 ? "POSITIVE" : rating <= 2 ? "NEGATIVE" : "NEUTRAL",
                score: 0.8,
              },
            };
          }
        }
      })()
    );
  }

  await Promise.all(batchPromises);
  return enrichedReviews;
}
