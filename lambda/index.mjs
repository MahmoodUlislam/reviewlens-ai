import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { v4 as uuidv4 } from "uuid";

// Configure chromium for Lambda
chromium.setHeadlessMode = "shell";
chromium.setGraphicsMode = false;

export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  let browser = null;

  try {
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "URL is required" }),
      };
    }

    // Validate it's an Amazon URL
    if (!url.includes("amazon.com") && !url.includes("amazon.ca") && !url.includes("amazon.co")) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Only Amazon product URLs are supported for scraping",
        }),
      };
    }

    // Launch browser
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to the product page first to get the product name
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const productName = await page
      .evaluate(() => {
        const titleEl = document.querySelector("#productTitle");
        return titleEl ? titleEl.textContent.trim() : "Unknown Product";
      })
      .catch(() => "Unknown Product");

    // Try to navigate to the reviews page
    let reviewsUrl = url;
    if (!url.includes("/product-reviews/")) {
      // Extract ASIN and build reviews URL
      const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
      if (asinMatch) {
        reviewsUrl = `https://www.amazon.com/product-reviews/${asinMatch[1]}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews&sortBy=recent`;
      }
    }

    await page.goto(reviewsUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait for reviews to load
    await page
      .waitForSelector('[data-hook="review"]', { timeout: 10000 })
      .catch(() => {});

    // Extract reviews
    const reviews = await page.evaluate(() => {
      const reviewEls = document.querySelectorAll('[data-hook="review"]');
      const results = [];

      reviewEls.forEach((el) => {
        try {
          // Rating
          const ratingEl = el.querySelector('[data-hook="review-star-rating"] .a-icon-alt, .review-rating .a-icon-alt');
          const ratingText = ratingEl ? ratingEl.textContent : "";
          const ratingMatch = ratingText.match(/([\d.]+)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

          // Title
          const titleEl = el.querySelector(
            '[data-hook="review-title"] span:not(.a-icon-alt), .review-title'
          );
          const title = titleEl ? titleEl.textContent.trim() : "";

          // Body
          const bodyEl = el.querySelector('[data-hook="review-body"] span');
          const body = bodyEl ? bodyEl.textContent.trim() : "";

          // Date
          const dateEl = el.querySelector('[data-hook="review-date"]');
          const dateText = dateEl ? dateEl.textContent.trim() : "";
          // Extract date from "Reviewed in the United States on January 15, 2024"
          const dateMatch = dateText.match(/on\s+(.+)$/);
          const date = dateMatch ? dateMatch[1] : dateText;

          // Reviewer name
          const nameEl = el.querySelector(".a-profile-name");
          const reviewer = nameEl ? nameEl.textContent.trim() : "Anonymous";

          // Verified purchase
          const verifiedEl = el.querySelector('[data-hook="avp-badge"]');
          const verified = !!verifiedEl;

          if (body || title) {
            results.push({ rating, title, body, date, reviewer, verified });
          }
        } catch {
          // Skip malformed reviews
        }
      });

      return results;
    });

    // Add UUIDs
    const reviewsWithIds = reviews.map((r) => ({
      ...r,
      id: uuidv4(),
    }));

    await browser.close();
    browser = null;

    if (reviewsWithIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "No reviews could be extracted. Amazon may be blocking the request. Please try CSV upload instead.",
          productName,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reviews: reviewsWithIds,
        productName,
        reviewCount: reviewsWithIds.length,
      }),
    };
  } catch (error) {
    console.error("Scraper error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Scraping failed: ${error.message}. Please try CSV upload instead.`,
      }),
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};
