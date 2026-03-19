import { ApifyClient } from "apify-client";
import { Review } from "@/types";
import { v4 as uuidv4 } from "uuid";

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Apify actor IDs for different platforms
const ACTOR_IDS: Record<string, string> = {
  Amazon: "junglee/amazon-reviews-scraper",
  "Google Maps": "compass/crawler-google-places",
};

interface ApifyAmazonReview {
  reviewTitle?: string;
  reviewBody?: string;
  ratingScore?: number;
  reviewedIn?: string;
  reviewerName?: string;
  isVerified?: boolean;
  date?: string;
  // Alternative field names
  title?: string;
  body?: string;
  text?: string;
  rating?: number;
  stars?: number;
  author?: string;
  name?: string;
  verified?: boolean;
}

export async function scrapeAmazonReviews(url: string): Promise<{
  reviews: Review[];
  productName: string;
}> {
  // Extract ASIN from URL
  const asinMatch = url.match(/\/(?:dp|gp\/product|product-reviews)\/([A-Z0-9]{10})/);
  if (!asinMatch) {
    throw new Error("Could not extract Amazon product ID (ASIN) from URL. Please ensure it's a valid Amazon product URL.");
  }

  const asin = asinMatch[1];

  // Run the Apify Amazon reviews scraper
  const run = await apifyClient.actor(ACTOR_IDS.Amazon).call({
    productUrls: [{ url: `https://www.amazon.com/dp/${asin}` }],
    maxReviews: 100,
    sort: "recent",
  }, {
    timeout: 120, // 2 minute timeout
    memory: 256,
  });

  // Fetch results from the dataset
  const { items } = await apifyClient
    .dataset(run.defaultDatasetId)
    .listItems();

  if (!items || items.length === 0) {
    throw new Error("No reviews found. The product may have no reviews or the scraper couldn't access them.");
  }

  // Transform Apify output to our Review format
  const reviews: Review[] = (items as unknown as ApifyAmazonReview[]).map((item) => ({
    id: uuidv4(),
    rating: item.ratingScore || item.rating || item.stars || 0,
    title: (item.reviewTitle || item.title || "").trim(),
    body: (item.reviewBody || item.body || item.text || "").trim(),
    date: (item.reviewedIn || item.date || "").replace(/^Reviewed in .* on /, "").trim(),
    reviewer: (item.reviewerName || item.author || item.name || "Anonymous").trim(),
    verified: item.isVerified ?? item.verified ?? false,
  })).filter((r) => r.body || r.title);

  // Try to extract product name from the first item or URL
  const productName = "Amazon Product " + asin;

  return { reviews, productName };
}

export async function scrapeWithLambdaFallback(url: string): Promise<{
  reviews: Review[];
  productName: string;
}> {
  const scraperUrl = process.env.SCRAPER_LAMBDA_URL;

  if (!scraperUrl) {
    throw new Error("Lambda scraper URL not configured");
  }

  const response = await fetch(scraperUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || "Lambda scraper failed"
    );
  }

  const data = await response.json() as {
    reviews: Review[];
    productName: string;
  };
  return { reviews: data.reviews, productName: data.productName };
}
