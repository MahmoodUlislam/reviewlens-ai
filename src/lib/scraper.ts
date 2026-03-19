import { Review } from "@/types";
import { v4 as uuidv4 } from "uuid";

const APIFY_BASE_URL = "https://api.apify.com/v2";

const ACTOR_IDS: Record<string, string> = {
  Amazon: "junglee~amazon-reviews-scraper",
  "Google Maps": "compass~google-maps-reviews-scraper",
};

export interface ScrapeResult {
  reviews: Review[];
  productName: string;
  overallRating?: number;
  totalGlobalRatings?: number;
}

// --- Shared Apify helpers ---

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

async function apifyFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("APIFY_API_TOKEN not configured");
  }
  const url = `${APIFY_BASE_URL}${path}`;
  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
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

async function startAndCollect(actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
  const startRes = await apifyFetch(`/acts/${actorId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Failed to start Apify actor: ${err}`);
  }

  const startData = (await startRes.json()) as ApifyRunResponse;
  const run = await waitForRun(startData.data.id, actorId);

  const datasetRes = await apifyFetch(`/datasets/${run.defaultDatasetId}/items?format=json`);
  if (!datasetRes.ok) {
    throw new Error("Failed to fetch Apify dataset results");
  }

  const items = (await datasetRes.json()) as unknown[];
  if (!items || items.length === 0) {
    throw new Error("No reviews found. The page may have no reviews or the scraper couldn't access them.");
  }

  return items;
}

// --- Amazon ---

interface ApifyAmazonReview {
  reviewTitle?: string;
  reviewBody?: string;
  ratingScore?: number;
  reviewedIn?: string;
  reviewerName?: string;
  isVerified?: boolean;
  date?: string;
  title?: string;
  body?: string;
  text?: string;
  rating?: number;
  stars?: number;
  author?: string;
  name?: string;
  verified?: boolean;
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

    const ratingMatch = html.match(/(\d+\.?\d*)\s+out of\s+5\s+stars/);
    const overallRating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

    const totalMatch = html.match(/([\d,]+)\s+global\s+ratings/);
    const totalGlobalRatings = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : undefined;

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

export async function scrapeAmazonReviews(url: string): Promise<ScrapeResult> {
  const asinMatch = url.match(/\/(?:dp|gp\/product|product-reviews)\/([A-Z0-9]{10})/);
  if (!asinMatch) {
    throw new Error("Could not extract Amazon product ID (ASIN) from URL. Please ensure it's a valid Amazon product URL.");
  }

  const asin = asinMatch[1];
  const actorId = ACTOR_IDS.Amazon;

  const overallPromise = scrapeOverallRating(asin);

  const items = (await startAndCollect(actorId, {
    productUrls: [{ url: `https://www.amazon.com/dp/${asin}` }],
    maxReviews: 100,
    sort: "recent",
  })) as ApifyAmazonReview[];

  const reviews: Review[] = items.map((item) => ({
    id: uuidv4(),
    rating: item.ratingScore || item.rating || item.stars || 0,
    title: (item.reviewTitle || item.title || "").trim(),
    body: (item.reviewBody || item.body || item.text || "").trim(),
    date: (item.reviewedIn || item.date || "").replace(/^Reviewed in .* on /, "").trim(),
    reviewer: (item.reviewerName || item.author || item.name || "Anonymous").trim(),
    verified: item.isVerified ?? item.verified ?? false,
  })).filter((r) => r.body || r.title);

  const overall = await overallPromise;
  const productName = overall.productName || "Amazon Product " + asin;

  return {
    reviews,
    productName,
    overallRating: overall.overallRating,
    totalGlobalRatings: overall.totalGlobalRatings,
  };
}

// --- Google Maps ---

interface ApifyGoogleMapsReview {
  text?: string;
  textTranslated?: string;
  stars?: number;
  publishedAtDate?: string;
  reviewerName?: string;
  isLocalGuide?: boolean;
}

export async function scrapeGoogleMapsReviews(url: string): Promise<ScrapeResult> {
  if (!url.includes("google.com/maps") && !url.includes("maps.app.goo.gl")) {
    throw new Error("Please provide a valid Google Maps URL.");
  }

  const actorId = ACTOR_IDS["Google Maps"];

  const items = (await startAndCollect(actorId, {
    startUrls: [{ url }],
    maxReviews: 100,
    reviewsSort: "newest",
    language: "en",
    scrapeReviewerName: true,
  })) as ApifyGoogleMapsReview[];

  const reviews: Review[] = items.map((item) => ({
    id: uuidv4(),
    rating: item.stars || 0,
    title: "",
    body: (item.textTranslated || item.text || "").trim(),
    date: item.publishedAtDate ? new Date(item.publishedAtDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "",
    reviewer: (item.reviewerName || "Anonymous").trim(),
    verified: item.isLocalGuide ?? false,
  })).filter((r) => r.body);

  // Extract place name from URL
  const nameMatch = url.match(/\/place\/([^/@]+)/);
  const productName = nameMatch ? decodeURIComponent(nameMatch[1]).replace(/\+/g, " ") : "Google Maps Place";

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const overallRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : undefined;

  return {
    reviews,
    productName,
    overallRating,
    totalGlobalRatings: reviews.length,
  };
}

// --- Platform dispatcher ---

export async function scrapeReviews(platform: string, url: string): Promise<ScrapeResult> {
  switch (platform) {
    case "Amazon":
      return scrapeAmazonReviews(url);
    case "Google Maps":
      return scrapeGoogleMapsReviews(url);
    default:
      throw new Error(`URL scraping is not supported for ${platform}. Please use CSV upload.`);
  }
}
