import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseCSVDetailed, ColumnMapping } from "@/lib/csv-parser";
import { analyzeSentiment } from "@/lib/comprehend";
import { computeAnalytics } from "@/lib/analytics";
import { setSession } from "@/lib/store";
import { scrapeReviews } from "@/lib/scraper";
import { Review, ReviewMetadata, ReviewSession } from "@/types";

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    // Check Content-Length before parsing body
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_CSV_SIZE) {
      return NextResponse.json(
        { success: false, error: `Request too large. Maximum size is ${MAX_CSV_SIZE / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { type, url, csvData, platform = "Amazon" } = body;

    if (type === "csv" && typeof csvData === "string" && csvData.length > MAX_CSV_SIZE) {
      return NextResponse.json(
        { success: false, error: `CSV data too large. Maximum size is ${MAX_CSV_SIZE / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    let reviews: Review[] = [];
    let productName = "Unknown Product";
    const productUrl = url || "";
    let overallRating: number | undefined;
    let totalGlobalRatings: number | undefined;
    let csvWarnings: string[] = [];
    let csvMapping: ColumnMapping | undefined;

    if (type === "url" && url) {
      try {
        const result = await scrapeReviews(platform, url);
        reviews = result.reviews;
        productName = result.productName;
        overallRating = result.overallRating;
        totalGlobalRatings = result.totalGlobalRatings;
      } catch (scrapeError) {
        console.warn("Scrape failed:", scrapeError);
        const message = scrapeError instanceof Error ? scrapeError.message : "Automated scraping failed.";
        return NextResponse.json(
          {
            success: false,
            error: message + " You can also try CSV upload instead.",
          },
          { status: 400 }
        );
      }
    } else if (type === "csv" && csvData) {
      const csvResult = parseCSVDetailed(csvData);
      reviews = csvResult.reviews;
      csvWarnings = csvResult.warnings;
      csvMapping = csvResult.mapping;
      productName = body.productName || "Uploaded Product";

      if (reviews.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: csvWarnings.length > 0
              ? csvWarnings.join(" ")
              : "No reviews could be extracted. Please check your CSV format.",
            columnMapping: csvMapping,
          },
          { status: 400 }
        );
      }
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

    // Extract date range (sort chronologically via Date parsing)
    const dates = enrichedReviews
      .map((r) => r.date)
      .filter(Boolean)
      .sort((a, b) => {
        const da = new Date(a).getTime();
        const db = new Date(b).getTime();
        // If both parse to valid dates, compare numerically
        if (!isNaN(da) && !isNaN(db)) return da - db;
        // Push unparseable dates to the end
        if (isNaN(da)) return 1;
        if (isNaN(db)) return -1;
        return a.localeCompare(b);
      });

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
      ...(csvMapping && { columnMapping: csvMapping, csvWarnings }),
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
