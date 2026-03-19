import { Review } from "@/types";
import { v4 as uuidv4 } from "uuid";

const APIFY_BASE_URL = "https://api.apify.com/v2";

// Apify actor IDs for different platforms
const ACTOR_IDS: Record<string, string> = {
  Amazon: "junglee~amazon-reviews-scraper",
  "Google Maps": "compass~crawler-google-places",
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

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface ApifyDatasetResponse {
  items: ApifyAmazonReview[];
}

async function apifyFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("APIFY_API_TOKEN not configured");
  }
  const url = `${APIFY_BASE_URL}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
  return fetch(url, options);
}

async function waitForRun(runId: string, actorId: string, timeoutMs = 120000): Promise<ApifyRunResponse["data"]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await apifyFetch(`/acts/${actorId}/runs/${runId}`);
    const data = (await res.json()) as ApifyRunResponse;
    if (data.data.status === "SUCCEEDED") return data.data;
    if (data.data.status === "FAILED" || data.data.status === "ABORTED") {
      throw new Error(`Apify run ${data.data.status.toLowerCase()}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Apify run timed out");
}

async function scrapeOverallRating(asin: string): Promise<{ overallRating?: number; totalGlobalRatings?: number; productName?: string }> {
  try {
    const res = await fetch(`https://www.amazon.com/dp/${asin}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await res.text();

    // Extract overall rating: "4.7 out of 5 stars"
    const ratingMatch = html.match(/(\d+\.?\d*)\s+out of\s+5\s+stars/);
    const overallRating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

    // Extract total ratings: "27,405 global ratings"
    const totalMatch = html.match(/([\d,]+)\s+global\s+ratings/);
    const totalGlobalRatings = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : undefined;

    // Extract product name from title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let productName: string | undefined;
    if (titleMatch) {
      productName = titleMatch[1]
        .replace(/\s*[-–|:]?\s*Amazon\.com.*$/i, "")
        .replace(/Amazon\.com\s*[-–|:]?\s*/i, "")
        .trim();
    }

    return { overallRating, totalGlobalRatings, productName: productName || undefined };
  } catch {
    return {};
  }
}

export async function scrapeAmazonReviews(url: string): Promise<{
  reviews: Review[];
  productName: string;
  overallRating?: number;
  totalGlobalRatings?: number;
}> {
  // Extract ASIN from URL
  const asinMatch = url.match(/\/(?:dp|gp\/product|product-reviews)\/([A-Z0-9]{10})/);
  if (!asinMatch) {
    throw new Error("Could not extract Amazon product ID (ASIN) from URL. Please ensure it's a valid Amazon product URL.");
  }

  const asin = asinMatch[1];
  const actorId = ACTOR_IDS.Amazon;

  // Fetch overall product rating in parallel with Apify scrape
  const overallPromise = scrapeOverallRating(asin);

  // Start the Apify actor run via REST API
  const startRes = await apifyFetch(`/acts/${actorId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productUrls: [{ url: `https://www.amazon.com/dp/${asin}` }],
      maxReviews: 100,
      sort: "recent",
    }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Failed to start Apify actor: ${err}`);
  }

  const startData = (await startRes.json()) as ApifyRunResponse;
  const run = await waitForRun(startData.data.id, actorId);

  // Fetch results from the dataset
  const datasetRes = await apifyFetch(`/datasets/${run.defaultDatasetId}/items?format=json`);
  if (!datasetRes.ok) {
    throw new Error("Failed to fetch Apify dataset results");
  }

  const items = (await datasetRes.json()) as ApifyAmazonReview[];

  if (!items || items.length === 0) {
    throw new Error("No reviews found. The product may have no reviews or the scraper couldn't access them.");
  }

  // Transform Apify output to our Review format
  const reviews: Review[] = items.map((item) => ({
    id: uuidv4(),
    rating: item.ratingScore || item.rating || item.stars || 0,
    title: (item.reviewTitle || item.title || "").trim(),
    body: (item.reviewBody || item.body || item.text || "").trim(),
    date: (item.reviewedIn || item.date || "").replace(/^Reviewed in .* on /, "").trim(),
    reviewer: (item.reviewerName || item.author || item.name || "Anonymous").trim(),
    verified: item.isVerified ?? item.verified ?? false,
  })).filter((r) => r.body || r.title);

  // Get overall rating results
  const overall = await overallPromise;
  const productName = overall.productName || "Amazon Product " + asin;

  return {
    reviews,
    productName,
    overallRating: overall.overallRating,
    totalGlobalRatings: overall.totalGlobalRatings,
  };
}
