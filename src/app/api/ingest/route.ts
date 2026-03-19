import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseCSV } from "@/lib/csv-parser";
import { analyzeSentiment } from "@/lib/comprehend";
import { computeAnalytics } from "@/lib/analytics";
import { setSession } from "@/lib/store";
import { scrapeAmazonReviews, scrapeWithLambdaFallback } from "@/lib/scraper";
import { Review, ReviewMetadata, ReviewSession } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, url, csvData, platform = "Amazon" } = body;

    let reviews: Review[] = [];
    let productName = "Unknown Product";
    let productUrl = url || "";

    if (type === "url" && url) {
      // Scraping strategy: Lambda/Puppeteer (free) → Apify (uses credits) → CSV fallback
      let scraped = false;

      // 1. Try Lambda/Puppeteer first (free, no credits)
      try {
        console.log("Attempting Lambda/Puppeteer scrape for:", url);
        const result = await scrapeWithLambdaFallback(url);
        reviews = result.reviews;
        productName = result.productName;
        scraped = true;
      } catch (lambdaError) {
        console.warn("Lambda/Puppeteer scrape failed:", lambdaError);
      }

      // 2. Fall back to Apify (uses credits, but reliable)
      if (!scraped) {
        try {
          console.log("Attempting Apify scrape for:", url);
          const result = await scrapeAmazonReviews(url);
          reviews = result.reviews;
          productName = result.productName;
          scraped = true;
        } catch (apifyError) {
          console.warn("Apify scrape also failed:", apifyError);
        }
      }

      // 3. If both failed, tell user to use CSV
      if (!scraped) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Automated scraping failed. This can happen due to anti-bot measures. Please use CSV upload instead — it works reliably every time.",
          },
          { status: 400 }
        );
      }
    } else if (type === "csv" && csvData) {
      reviews = parseCSV(csvData);
      productName = body.productName || "Uploaded Product";
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid request. Provide URL or CSV data." },
        { status: 400 }
      );
    }

    if (reviews.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No reviews found. Please check your input and try again.",
        },
        { status: 400 }
      );
    }

    // Analyze sentiment with Amazon Comprehend
    const enrichedReviews = await analyzeSentiment(reviews);

    // Compute analytics
    const analytics = computeAnalytics(enrichedReviews);

    // Sort reviews by date (newest first)
    const dates = enrichedReviews
      .map((r) => r.date)
      .filter(Boolean)
      .sort();

    const metadata: ReviewMetadata = {
      platform,
      productName,
      productUrl,
      totalReviews: enrichedReviews.length,
      averageRating: analytics.averageRating,
      dateRange: {
        earliest: dates[0] || "Unknown",
        latest: dates[dates.length - 1] || "Unknown",
      },
      scrapedAt: new Date().toISOString(),
    };

    // Store session
    const sessionId = uuidv4();
    const session: ReviewSession = {
      sessionId,
      reviews: enrichedReviews,
      metadata,
      analytics,
    };
    setSession(sessionId, session);

    return NextResponse.json({
      success: true,
      sessionId,
      metadata,
      reviewCount: enrichedReviews.length,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process reviews. Please try again.",
      },
      { status: 500 }
    );
  }
}
