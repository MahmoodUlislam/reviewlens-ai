import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildScopeGuardCheck } from "@/lib/prompts";
import { Review, ReviewMetadata } from "@/types";

const mockMetadata: ReviewMetadata = {
  platform: "Amazon",
  productName: "Test Widget",
  productUrl: "https://amazon.com/dp/B123",
  totalReviews: 3,
  averageRating: 4.3,
  dateRange: { earliest: "2026-01-01", latest: "2026-03-01" },
  scrapedAt: "2026-03-19T00:00:00Z",
};

const mockReviews: Review[] = [
  {
    id: "1",
    rating: 5,
    title: "Love it",
    body: "Best product ever",
    date: "2026-01-01",
    reviewer: "Alice",
    verified: true,
  },
  {
    id: "2",
    rating: 3,
    title: "Average",
    body: "It was okay",
    date: "2026-02-15",
    reviewer: "Bob",
    verified: false,
  },
];

describe("buildSystemPrompt", () => {
  it("includes platform and product name in context", () => {
    const prompt = buildSystemPrompt(mockMetadata, mockReviews);

    expect(prompt).toContain("Platform: Amazon");
    expect(prompt).toContain("Product/Entity: Test Widget");
  });

  it("includes review count and date range", () => {
    const prompt = buildSystemPrompt(mockMetadata, mockReviews);

    expect(prompt).toContain("Total Reviews Analyzed: 3");
    expect(prompt).toContain("2026-01-01 to 2026-03-01");
  });

  it("includes all reviews with numbered references", () => {
    const prompt = buildSystemPrompt(mockMetadata, mockReviews);

    expect(prompt).toContain("[Review #1]");
    expect(prompt).toContain("[Review #2]");
    expect(prompt).toContain("Best product ever");
    expect(prompt).toContain("It was okay");
  });

  it("includes scope enforcement rules", () => {
    const prompt = buildSystemPrompt(mockMetadata, mockReviews);

    expect(prompt).toContain("STRICT RULES");
    expect(prompt).toContain("ONLY answer questions about the specific reviews");
    expect(prompt).toContain("politely decline");
  });

  it("includes decline template with product context", () => {
    const prompt = buildSystemPrompt(mockMetadata, mockReviews);

    expect(prompt).toContain("3 Amazon reviews");
    expect(prompt).toContain("Test Widget");
  });

  it("includes reviewer names and ratings in review data", () => {
    const prompt = buildSystemPrompt(mockMetadata, mockReviews);

    expect(prompt).toContain("By: Alice");
    expect(prompt).toContain("Rating: 5/5");
    expect(prompt).toContain("By: Bob");
    expect(prompt).toContain("Rating: 3/5");
  });
});

describe("buildScopeGuardCheck", () => {
  it("includes the user message in the check prompt", () => {
    const result = buildScopeGuardCheck("What is the weather today?");
    expect(result).toContain("What is the weather today?");
  });

  it("mentions OUT_OF_SCOPE and IN_SCOPE response formats", () => {
    const result = buildScopeGuardCheck("test");
    expect(result).toContain("OUT_OF_SCOPE");
    expect(result).toContain("IN_SCOPE");
  });

  it("lists off-topic categories", () => {
    const result = buildScopeGuardCheck("test");
    expect(result).toContain("weather");
    expect(result).toContain("news");
    expect(result).toContain("coding");
  });
});
