import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseCSV } from "@/lib/csv-parser";
import { analyzeSentiment } from "@/lib/comprehend";
import { computeAnalytics } from "@/lib/analytics";
import { setSession } from "@/lib/store";
import { scrapeAmazonReviews } from "@/lib/scraper";
import { Review, ReviewMetadata, ReviewSession } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, url, csvData, platform = "Amazon" } = body;

    let reviews: Review[] = [];
    let productName = "Unknown Product";
    let productUrl = url || "";
    let overallRating: number | undefined;
    let totalGlobalRatings: number | undefined;

    if (type === "url" && url) {
      try {
        const result = await scrapeAmazonReviews(url);
        reviews = result.reviews;
        productName = result.productName;
        overallRating = result.overallRating;
        totalGlobalRatings = result.totalGlobalRatings;
      } catch (scrapeError) {
        console.warn("Scrape failed:", scrapeError);
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
      overallRating,
      totalGlobalRatings,
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
      reviews: enrichedReviews,
      analytics,
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
